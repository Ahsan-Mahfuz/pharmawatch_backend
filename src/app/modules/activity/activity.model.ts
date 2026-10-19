import { Schema, model } from "mongoose";

const activitySchema = new Schema(
  {
    kind: { type: String, enum: ["event", "audit"], default: "event", index: true },
    text: { type: String, default: "" },
    tone: {
      type: String,
      enum: ["muted", "active", "near", "critical", "expired"],
      default: "muted",
    },
    actor: { type: String, default: "" },
    action: { type: String, default: "" },
    path: { type: String, default: "" },
    status: { type: Number, default: 0 },
    ip: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

activitySchema.index({ createdAt: -1 });

export const Activity = model("Activity", activitySchema);
