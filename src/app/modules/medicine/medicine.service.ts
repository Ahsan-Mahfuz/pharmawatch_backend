import AppError from "../../error/appError";
import { listMeta, pageOf } from "../../builder/listQuery";
import { Batch } from "../batch/batch.model";
import { Medicine } from "./medicine.model";
import { CreateMedicineInput, UpdateMedicineInput } from "./medicine.validation";

const getAll = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = pageOf(query, 50);
  const filter: Record<string, unknown> = {};

  if (query.search) {
    const regex = { $regex: String(query.search), $options: "i" };
    filter.$or = [{ name: regex }, { generic: regex }];
  }
  if (query.form) filter.form = query.form;
  if (query.active === "true") filter.isActive = true;

  const [rows, total] = await Promise.all([
    Medicine.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Medicine.countDocuments(filter),
  ]);

  return { data: rows, meta: listMeta(page, limit, total) };
};

const findById = async (id: string) => {
  const doc = await Medicine.findById(id);
  if (!doc) throw new AppError(404, "Medicine not found");
  return doc;
};

const create = async (payload: CreateMedicineInput) => {
  const taken = await Medicine.findOne({
    name: payload.name,
    strength: payload.strength,
    form: payload.form,
  }).lean();

  if (taken) {
    throw new AppError(
      409,
      `${payload.name} ${payload.strength} is already in the catalogue`,
      [{ path: "name", message: "Already in the catalogue" }],
    );
  }

  return Medicine.create(payload);
};

const update = async (id: string, payload: UpdateMedicineInput) => {
  const doc = await findById(id);
  Object.assign(doc, payload);
  await doc.save();
  return doc;
};

const remove = async (id: string) => {
  const used = await Batch.countDocuments({ medicine: id });
  if (used) {
    throw new AppError(
      409,
      "This medicine still has batches on the register. Deactivate it instead.",
    );
  }
  await Medicine.deleteOne({ _id: id });
  return { deleted: true };
};

export const MedicineService = { getAll, findById, create, update, remove };
