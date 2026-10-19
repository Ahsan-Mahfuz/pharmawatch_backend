import { Schema, model } from "mongoose";
import { IBatch } from "./batch.interface";

const batchSchema = new Schema<IBatch>(
  {
    batchNo: { type: String, required: true, trim: true, uppercase: true },
    medicine: { type: Schema.Types.ObjectId, ref: "Medicine", required: true, index: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },

    qtyIn: { type: Number, required: true, min: 1 },
    left: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },

    received: { type: Date, required: true },
    expiry: { type: Date, required: true, index: true },
    cutoff: { type: Date, required: true },

    r30: { type: Number, default: 0, min: 0 },
    r7: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 90 },

    state: {
      type: String,
      enum: ["open", "returned", "written-off"],
      default: "open",
      index: true,
    },
    closedQty: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false },
);

batchSchema.index({ medicine: 1, batchNo: 1 }, { unique: true });

export const Batch = model<IBatch>("Batch", batchSchema);
