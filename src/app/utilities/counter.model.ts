import { Schema, model } from "mongoose";

const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Counter = model("Counter", counterSchema);

export const nextSequence = async (key: string, start = 1): Promise<number> => {
  const existing = await Counter.findById(key).lean();
  if (!existing) {
    await Counter.create({ _id: key, seq: start });
    return start;
  }
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, lean: true },
  );
  return doc?.seq ?? start;
};
