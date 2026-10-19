import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser } from "./user.interface";

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["owner", "pharmacist"], default: "pharmacist", index: true },
    pharmacy: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 1 },
    lastLoginAt: { type: Date, default: null },

    resetTokenHash: { type: String, default: null, select: false },
    resetExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true, versionKey: false },
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function matchPassword(plain: string) {
  return bcrypt.compare(plain, this.password);
};

export const User = model<IUser>("User", userSchema);
