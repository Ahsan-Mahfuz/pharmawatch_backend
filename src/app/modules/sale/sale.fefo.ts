import AppError from "../../error/appError";
import { today } from "../../domain";
import { Batch } from "../batch/batch.model";
import { BatchRow, POPULATE, toView } from "../batch/batch.view";

export type Allocation = {
  batchId: string;
  batchNo: string;
  medicineId: string;
  medicineName: string;
  unit: string;
  qty: number;
  unitPrice: number;
  fullPrice: number;
  discount: number;
  expiry: string;
};

export const sellableOf = async (medicineId: string) => {
  const rows = (await Batch.find({
    medicine: medicineId,
    state: "open",
    left: { $gt: 0 },
    expiry: { $gte: today() },
  })
    .sort({ expiry: 1 })
    .populate(POPULATE)
    .lean()) as unknown as BatchRow[];

  return rows.map(toView);
};

export const allocate = async (
  medicineId: string,
  quantity: number,
): Promise<Allocation[]> => {
  const queue = await sellableOf(medicineId);

  if (!queue.length) {
    throw new AppError(400, "No sellable batch of that medicine is left");
  }

  const available = queue.reduce((sum, batch) => sum + batch.left, 0);
  if (available < quantity) {
    throw new AppError(
      409,
      `Only ${available} ${queue[0].unit} of ${queue[0].medicine.name} are on the shelf`,
    );
  }

  const picked: Allocation[] = [];
  let wanted = quantity;

  for (const batch of queue) {
    if (wanted <= 0) break;
    const qty = Math.min(wanted, batch.left);
    wanted -= qty;

    picked.push({
      batchId: batch.id,
      batchNo: batch.batchNo,
      medicineId: batch.medicine.id,
      medicineName: batch.medicine.name,
      unit: batch.unit,
      qty,
      unitPrice: batch.priceNow,
      fullPrice: batch.price,
      discount: batch.discount,
      expiry: batch.expiry,
    });
  }

  return picked;
};

export const holdStock = async (lines: Allocation[]) => {
  const applied: Allocation[] = [];

  for (const line of lines) {
    const result = await Batch.updateOne(
      {
        _id: line.batchId,
        state: "open",
        left: { $gte: line.qty },
        expiry: { $gte: today() },
      },
      { $inc: { left: -line.qty } },
    );

    if (result.modifiedCount !== 1) {
      await releaseStock(applied);
      throw new AppError(
        409,
        `${line.medicineName} in batch ${line.batchNo} just ran out. Please start the sale again.`,
      );
    }

    applied.push(line);
  }
};

export const releaseStock = async (lines: Allocation[]) => {
  if (!lines.length) return;
  await Batch.bulkWrite(
    lines.map((line) => ({
      updateOne: { filter: { _id: line.batchId }, update: { $inc: { left: line.qty } } },
    })),
    { ordered: false },
  );
};
