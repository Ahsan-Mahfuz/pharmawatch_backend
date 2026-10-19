import { Schema, model } from "mongoose";

const supplierSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    address: { type: String, default: "", trim: true },
    returnWindowDays: { type: Number, default: 90, min: 0, max: 365 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

export const Supplier = model("Supplier", supplierSchema);
