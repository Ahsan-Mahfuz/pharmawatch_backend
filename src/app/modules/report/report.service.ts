import { monthKey, today } from "../../domain";
import { BatchService } from "../batch/batch.service";
import { BatchView } from "../batch/batch.view";
import { StockAction } from "../approval/approval.model";
import { Sale } from "../sale/sale.model";

const startOfToday = () => today();

const summary = async () => {
  const batches = await BatchService.viewsOf();
  const open = batches.filter((batch) => !batch.closed);

  const [pending, todaysSales] = await Promise.all([
    StockAction.countDocuments({ status: "pending" }),
    Sale.find({ createdAt: { $gte: startOfToday() } }).lean(),
  ]);

  return {
    stockOnShelf: Math.round(
      open.filter((b) => b.daysToExpiry >= 0).reduce((sum, b) => sum + b.left * b.cost, 0),
    ),
    openBatches: open.length,
    valueAtRisk90: Math.round(
      open.filter((b) => b.daysToExpiry <= 90).reduce((sum, b) => sum + b.valueAtRisk, 0),
    ),
    expiringIn30: open.filter((b) => b.daysToExpiry >= 0 && b.daysToExpiry <= 30).length,
    expired: open.filter((b) => b.daysToExpiry < 0).length,
    pendingApprovals: pending,
    salesToday: Math.round(todaysSales.reduce((sum, sale) => sum + sale.total, 0)),
    invoicesToday: todaysSales.length,
    needsDecision: open.filter(
      (b) => b.daysToExpiry < 0 || (b.riskScore >= 0.55 && b.daysToExpiry <= 120),
    ).length,
  };
};

const expiryCalendar = async (months: number) => {
  const open = (await BatchService.viewsOf({ state: "open" })).filter((b) => !b.closed);

  const buckets = new Map<string, { month: string; batches: number; valueAtRisk: number }>();
  let past = { month: "past", batches: 0, valueAtRisk: 0 };
  let beyond = { month: "beyond", batches: 0, valueAtRisk: 0 };

  const base = today();
  const keys: string[] = [];
  for (let index = 0; index < months; index += 1) {
    const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + index, 1));
    const key = monthKey(date);
    keys.push(key);
    buckets.set(key, { month: key, batches: 0, valueAtRisk: 0 });
  }

  for (const batch of open) {
    const target =
      batch.daysToExpiry < 0
        ? past
        : (buckets.get(monthKey(batch.expiry)) ?? beyond);
    target.batches += 1;
    target.valueAtRisk += batch.valueAtRisk;
  }

  const round = (bucket: { month: string; batches: number; valueAtRisk: number }) => ({
    ...bucket,
    valueAtRisk: Math.round(bucket.valueAtRisk),
  });

  return {
    past: round(past),
    months: keys.map((key) => round(buckets.get(key)!)),
    beyond: round(beyond),
  };
};

const bySupplier = (open: BatchView[]) => {
  const rows = new Map<string, { supplier: string; batches: number; stock: number; valueAtRisk: number }>();

  for (const batch of open) {
    const key = batch.supplier.name;
    const row = rows.get(key) ?? { supplier: key, batches: 0, stock: 0, valueAtRisk: 0 };
    row.batches += 1;
    row.stock += batch.left * batch.cost;
    row.valueAtRisk += batch.valueAtRisk;
    rows.set(key, row);
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      stock: Math.round(row.stock),
      valueAtRisk: Math.round(row.valueAtRisk),
    }))
    .sort((a, b) => b.valueAtRisk - a.valueAtRisk);
};

const lossSummary = async (query: Record<string, unknown>) => {
  const range: Record<string, Date> = {};
  if (query.from) range.$gte = new Date(String(query.from));
  if (query.to) range.$lte = new Date(String(query.to));
  const when = Object.keys(range).length ? { resolvedAt: range } : {};

  const [actions, sales, batches] = await Promise.all([
    StockAction.find({ status: "approved", ...when }).lean(),
    Sale.find(Object.keys(range).length ? { createdAt: range } : {}).lean(),
    BatchService.viewsOf(),
  ]);

  const open = batches.filter((batch) => !batch.closed);
  const of = (type: string) => actions.filter((action) => action.type === type);

  const returns = of("RETURN_TO_SUPPLIER");
  const writeOffs = of("WRITE_OFF");
  const discounted = sales.filter((sale) => sale.fullTotal > sale.total);

  return {
    recovered: returns.reduce((sum, action) => sum + action.value, 0),
    returnsApproved: returns.length,
    writtenOff: writeOffs.reduce((sum, action) => sum + action.value, 0),
    writeOffsApproved: writeOffs.length,
    discountSales: Math.round(discounted.reduce((sum, sale) => sum + sale.total, 0)),
    discountGiven: Math.round(
      discounted.reduce((sum, sale) => sum + (sale.fullTotal - sale.total), 0),
    ),
    stillAtRisk90: Math.round(
      open.filter((b) => b.daysToExpiry <= 90).reduce((sum, b) => sum + b.valueAtRisk, 0),
    ),
    bySupplier: bySupplier(open),
    liveDiscounts: open
      .filter((batch) => batch.discount > 0)
      .map((batch) => ({
        batchId: batch.id,
        batchNo: batch.batchNo,
        medicine: batch.medicine.name,
        discount: batch.discount,
        price: batch.price,
        priceNow: batch.priceNow,
        left: batch.left,
        riskScore: batch.riskScore,
      })),
  };
};

const returnWindows = async (withinDays: number) => {
  const open = (await BatchService.viewsOf()).filter((batch) => !batch.closed);

  return open
    .filter((b) => b.daysToExpiry >= 0 && b.daysToCutoff >= 0 && b.daysToCutoff <= withinDays)
    .sort((a, b) => a.daysToCutoff - b.daysToCutoff)
    .map((batch) => ({
      batchId: batch.id,
      batchNo: batch.batchNo,
      medicine: batch.medicine.name,
      supplier: batch.supplier.name,
      daysToCutoff: batch.daysToCutoff,
      cutoff: batch.cutoff,
      left: batch.left,
      recoverable: Math.round(batch.left * batch.cost),
      riskScore: batch.riskScore,
    }));
};

export const ReportService = { summary, expiryCalendar, lossSummary, returnWindows };
