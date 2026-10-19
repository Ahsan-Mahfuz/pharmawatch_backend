import AppError from "../../error/appError";
import { listMeta, pageOf, paginate } from "../../builder/listQuery";
import { addDays, startOfDay, today } from "../../domain";
import { ActivityService } from "../activity/activity.service";
import { Medicine } from "../medicine/medicine.model";
import { StockAction } from "../approval/approval.model";
import { Supplier } from "../supplier/supplier.model";
import { Batch } from "./batch.model";
import { BatchRow, BatchView, POPULATE, toView } from "./batch.view";
import { CreateBatchInput, DiscountInput, UpdateBatchInput } from "./batch.validation";

const SORTERS: Record<string, (a: BatchView, b: BatchView) => number> = {
  days: (a, b) => a.daysToExpiry - b.daysToExpiry,
  risk: (a, b) => b.riskScore - a.riskScore || a.daysToExpiry - b.daysToExpiry,
  value: (a, b) => b.valueAtRisk - a.valueAtRisk || a.daysToExpiry - b.daysToExpiry,
  name: (a, b) => a.medicine.name.localeCompare(b.medicine.name),
};

const SEGMENTS: Record<string, (b: BatchView) => boolean> = {
  shelf: (b) => !b.closed,
  action: (b) => !b.closed && (b.daysToExpiry < 0 || (b.riskScore >= 0.4 && b.daysToExpiry <= 120)),
  expired: (b) => b.status === "expired",
  closed: (b) => b.closed,
  all: () => true,
};

export const viewsOf = async (filter: Record<string, unknown> = {}): Promise<BatchView[]> => {
  const rows = (await Batch.find(filter).populate(POPULATE).lean()) as unknown as BatchRow[];
  return rows.map(toView);
};

const getAll = async (query: Record<string, unknown>) => {
  const { page, limit } = pageOf(query, 20);
  const filter: Record<string, unknown> = {};
  if (query.medicineId) filter.medicine = query.medicineId;
  if (query.supplierId) filter.supplier = query.supplierId;

  let rows = await viewsOf(filter);

  const search = String(query.search ?? "").trim().toLowerCase();
  if (search) {
    rows = rows.filter((row) =>
      `${row.medicine.name} ${row.medicine.generic} ${row.batchNo}`
        .toLowerCase()
        .includes(search),
    );
  }

  const segment = SEGMENTS[String(query.status ?? "all")] ?? SEGMENTS.all;
  rows = rows.filter(segment);

  if (query.expiringWithinDays) {
    const horizon = Number(query.expiringWithinDays);
    rows = rows.filter((row) => row.daysToExpiry >= 0 && row.daysToExpiry <= horizon);
  }

  rows.sort(SORTERS[String(query.sort ?? "days")] ?? SORTERS.days);

  return { data: paginate(rows, page, limit), meta: listMeta(page, limit, rows.length) };
};

const findView = async (id: string): Promise<BatchView> => {
  const row = (await Batch.findById(id).populate(POPULATE).lean()) as unknown as BatchRow | null;
  if (!row) throw new AppError(404, "Batch not found");
  return toView(row);
};

const create = async (payload: CreateBatchInput, userId: string): Promise<BatchView> => {
  const [medicine, supplier] = await Promise.all([
    Medicine.findById(payload.medicine).lean(),
    Supplier.findById(payload.supplier).lean(),
  ]);

  if (!medicine) throw new AppError(400, "That medicine is not on the list");
  if (!supplier) throw new AppError(400, "That supplier is not on the list");

  const received = startOfDay(payload.received ?? today());
  const expiry = startOfDay(payload.expiry);
  const cutoff = payload.cutoff
    ? startOfDay(payload.cutoff)
    : addDays(expiry, -supplier.returnWindowDays);

  const doc = await Batch.create({
    batchNo: payload.batchNo,
    medicine: payload.medicine,
    supplier: payload.supplier,
    qtyIn: payload.qtyIn,
    left: payload.qtyIn,
    cost: payload.cost,
    price: payload.price,
    received,
    expiry,
    cutoff,
    createdBy: userId,
  });

  await ActivityService.log(
    `${payload.qtyIn} ${medicine.unit} of ${medicine.name} received · ${doc.batchNo}`,
    "active",
  );

  return findView(String(doc._id));
};

const update = async (id: string, payload: UpdateBatchInput): Promise<BatchView> => {
  const doc = await Batch.findById(id);
  if (!doc) throw new AppError(404, "Batch not found");
  if (doc.state !== "open") throw new AppError(409, "This batch is closed and cannot be edited");

  Object.assign(doc, payload);
  if (doc.cutoff > doc.expiry) {
    throw new AppError(400, "The return window must close before expiry");
  }
  await doc.save();
  return findView(id);
};

const applyDiscount = async (id: string, payload: DiscountInput): Promise<BatchView> => {
  const doc = await Batch.findById(id).populate(POPULATE);
  if (!doc) throw new AppError(404, "Batch not found");
  if (doc.state !== "open" || doc.left <= 0) {
    throw new AppError(409, "This batch is off the shelf");
  }

  const pending = await StockAction.countDocuments({ batch: id, status: "pending" });
  if (pending) throw new AppError(409, "This batch is already waiting on a decision");

  doc.discount = payload.percent;
  await doc.save();

  const view = await findView(id);
  await ActivityService.log(
    `${payload.percent}% off applied to ${view.medicine.name} · ${view.batchNo}`,
    "critical",
  );
  return view;
};

export const BatchService = { getAll, findView, viewsOf, create, update, applyDiscount };
