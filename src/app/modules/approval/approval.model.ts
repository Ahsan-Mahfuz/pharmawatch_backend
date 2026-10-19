import { Schema, model } from "mongoose";

export const ACTION_TYPES = ["RETURN_TO_SUPPLIER", "WRITE_OFF"] as const;
export const ACTION_STATUSES = ["pending", "approved", "rejected"] as const;

const stockActionSchema = new Schema(
  {
    requestNo: { type: String, required: true, unique: true },
    type: { type: String, enum: ACTION_TYPES, required: true },

    batch: { type: Schema.Types.ObjectId, ref: "Batch", required: true, index: true },
    batchNo: { type: String, required: true },
    medicineName: { type: String, required: true },

    qty: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "units" },
    value: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "", trim: true },

    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedByName: { type: String, required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedByName: { type: String, default: "" },

    status: { type: String, enum: ACTION_STATUSES, default: "pending", index: true },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

stockActionSchema.index({ batch: 1, status: 1 });

export const StockAction = model("StockAction", stockActionSchema);
