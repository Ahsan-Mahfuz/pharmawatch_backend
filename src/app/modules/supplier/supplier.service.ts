import AppError from "../../error/appError";
import { Batch } from "../batch/batch.model";
import { Supplier } from "./supplier.model";
import { CreateSupplierInput, UpdateSupplierInput } from "./supplier.validation";

const getAll = async (query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = {};
  if (query.active === "true") filter.isActive = true;
  if (query.search) filter.name = { $regex: String(query.search), $options: "i" };
  return Supplier.find(filter).sort({ name: 1 }).lean();
};

const findById = async (id: string) => {
  const doc = await Supplier.findById(id);
  if (!doc) throw new AppError(404, "Supplier not found");
  return doc;
};

const create = async (payload: CreateSupplierInput) => {
  const taken = await Supplier.findOne({ name: payload.name }).lean();

  if (taken) {
    throw new AppError(409, `${payload.name} is already on the supplier list`, [
      { path: "name", message: "Already on the list" },
    ]);
  }

  return Supplier.create(payload);
};

const update = async (id: string, payload: UpdateSupplierInput) => {
  const doc = await findById(id);
  Object.assign(doc, payload);
  await doc.save();
  return doc;
};

const remove = async (id: string) => {
  const used = await Batch.countDocuments({ supplier: id });
  if (used) {
    throw new AppError(
      409,
      "This supplier still has batches on the register. Deactivate it instead.",
    );
  }
  await Supplier.deleteOne({ _id: id });
  return { deleted: true };
};

export const SupplierService = { getAll, findById, create, update, remove };
