import AppError from "../../error/appError";
import { listMeta, pageOf } from "../../builder/listQuery";
import { nextSequence } from "../../utilities/counter.model";
import { TokenPayload } from "../auth/auth.interface";
import { ActivityService } from "../activity/activity.service";
import { Sale } from "./sale.model";
import { Allocation, allocate, holdStock, releaseStock, sellableOf } from "./sale.fefo";
import { CreateSaleInput } from "./sale.validation";

const INVOICE_START = 10423;

const mergeLines = (items: CreateSaleInput["items"]) => {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.medicine, (merged.get(item.medicine) ?? 0) + item.qty);
  }
  return [...merged.entries()].map(([medicine, qty]) => ({ medicine, qty }));
};

const suggestion = async (medicineId: string, quantity: number) => {
  const queue = await sellableOf(medicineId);
  const lines = await allocate(medicineId, Math.min(quantity, Math.max(1, quantity)));

  return {
    picked: lines,
    queue: queue.map((batch, index) => ({
      batchId: batch.id,
      batchNo: batch.batchNo,
      expiry: batch.expiry,
      left: batch.left,
      role: index === 0 ? "Sells first" : "Waits its turn",
    })),
  };
};

const create = async (payload: CreateSaleInput, user: TokenPayload) => {
  const wanted = mergeLines(payload.items);

  const lines: Allocation[] = [];
  for (const line of wanted) {
    lines.push(...(await allocate(line.medicine, line.qty)));
  }

  await holdStock(lines);

  try {
    const seq = await nextSequence("invoice", INVOICE_START);
    const total = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
    const fullTotal = lines.reduce((sum, line) => sum + line.qty * line.fullPrice, 0);

    const sale = await Sale.create({
      invoiceNo: `INV-${seq}`,
      soldBy: user.userId,
      soldByName: user.name,
      customerName: payload.customerName,
      total: Number(total.toFixed(2)),
      fullTotal: Number(fullTotal.toFixed(2)),
      items: lines.map((line) => ({
        batch: line.batchId,
        batchNo: line.batchNo,
        medicine: line.medicineId,
        medicineName: line.medicineName,
        unit: line.unit,
        qty: line.qty,
        unitPrice: line.unitPrice,
        fullPrice: line.fullPrice,
        discount: line.discount,
        lineTotal: Number((line.qty * line.unitPrice).toFixed(2)),
      })),
    });

    await ActivityService.log(
      `Sale ${sale.invoiceNo} recorded · BDT ${Math.round(total).toLocaleString("en-IN")}`,
      "active",
      user.email,
    );

    return sale.toObject();
  } catch (error) {
    await releaseStock(lines);
    throw error;
  }
};

const getAll = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = pageOf(query, 20);
  const filter: Record<string, unknown> = {};

  if (query.soldBy) filter.soldBy = query.soldBy;
  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: new Date(String(query.from)) } : {}),
      ...(query.to ? { $lte: new Date(String(query.to)) } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Sale.countDocuments(filter),
  ]);

  return { data: rows, meta: listMeta(page, limit, total) };
};

const findById = async (id: string) => {
  const doc = await Sale.findById(id).lean();
  if (!doc) throw new AppError(404, "Sale not found");
  return doc;
};

const movementOf = async (batchId: string) => {
  const rows = await Sale.find({ "items.batch": batchId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return rows.flatMap((sale) =>
    sale.items
      .filter((item) => String(item.batch) === String(batchId))
      .map((item) => ({
        invoiceNo: sale.invoiceNo,
        soldBy: sale.soldByName,
        at: sale.createdAt,
        qty: item.qty,
        unitPrice: item.unitPrice,
        discount: item.discount,
        lineTotal: item.lineTotal,
      })),
  );
};

export const SaleService = { create, getAll, findById, movementOf, suggestion };
