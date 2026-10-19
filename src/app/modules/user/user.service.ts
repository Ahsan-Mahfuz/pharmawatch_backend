import AppError from "../../error/appError";
import { Account } from "../auth/auth.interface";
import { IUser } from "./user.interface";
import { User } from "./user.model";

export const format = (doc: IUser): Account => ({
  id: String(doc._id),
  name: doc.name,
  email: doc.email,
  role: doc.role,
  pharmacy: doc.pharmacy,
  isActive: doc.isActive,
  lastLoginAt: doc.lastLoginAt,
});

const getAll = async (): Promise<Account[]> => {
  const rows = await User.find().sort({ role: 1, name: 1 });
  return rows.map(format);
};

const findById = async (id: string): Promise<IUser> => {
  const doc = await User.findById(id);
  if (!doc) throw new AppError(404, "That account was not found");
  return doc;
};

const addStaff = async (
  pharmacy: string,
  payload: { name: string; email: string; password: string; role: "owner" | "pharmacist" },
): Promise<Account> => {
  const doc = await User.create({ ...payload, pharmacy });
  return format(doc);
};

const setActive = async (id: string, isActive: boolean): Promise<Account> => {
  const doc = await findById(id);
  doc.isActive = isActive;
  if (!isActive) doc.tokenVersion += 1;
  await doc.save();
  return format(doc);
};

export const UserService = { getAll, findById, addStaff, setActive, format };
