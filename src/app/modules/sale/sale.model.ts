import { Schema, model } from "mongoose";

const saleItemSchema = new Schema(
  {
    batch: { type: Schema.Types.ObjectId, ref: "Batch", required: true, index: true },
    batchNo: { type: String, required: true },
    medicine: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
    medicineName: { type: String, required: true },
    unit: { type: String, default: "units" },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    fullPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const saleSchema = new Schema(
  {
    invoiceNo: { type: String, required: true, unique: true },
    soldBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    soldByName: { type: String, required: true },
    customerName: { type: String, default: "", trim: true },
    items: { type: [saleItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    fullTotal: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

saleSchema.index({ createdAt: -1 });

export const Sale = model("Sale", saleSchema);
