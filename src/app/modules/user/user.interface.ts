import { Document, Types } from "mongoose";
import { TRole } from "../auth/auth.interface";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: TRole;
  pharmacy: string;
  isActive: boolean;
  tokenVersion: number;
  lastLoginAt: Date | null;
  resetTokenHash: string | null;
  resetExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(plain: string): Promise<boolean>;
}
