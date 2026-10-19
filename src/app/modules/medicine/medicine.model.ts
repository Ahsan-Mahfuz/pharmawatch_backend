import { Schema, model } from "mongoose";

export const FORMS = ["tablet", "capsule", "syrup", "injection", "ointment", "inhaler"] as const;

const medicineSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    generic: { type: String, required: true, trim: true, index: true },
    strength: { type: String, default: "", trim: true },
    form: { type: String, enum: FORMS, default: "tablet" },
    manufacturer: { type: String, default: "", trim: true },
    unit: { type: String, default: "strips", trim: true },
    reorderLevel: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

medicineSchema.index({ name: 1, strength: 1, form: 1 }, { unique: true });

export const Medicine = model("Medicine", medicineSchema);
