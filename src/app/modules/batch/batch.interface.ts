import { Document, Types } from "mongoose";
import { BatchState } from "../../domain/status";

export interface IBatch extends Document {
  _id: Types.ObjectId;
  batchNo: string;
  medicine: Types.ObjectId;
  supplier: Types.ObjectId;
  qtyIn: number;
  left: number;
  cost: number;
  price: number;
  received: Date;
  expiry: Date;
  cutoff: Date;
  r30: number;
  r7: number;
  discount: number;
  state: BatchState;
  closedQty: number;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PopulatedMedicine = {
  _id: Types.ObjectId;
  name: string;
  generic: string;
  strength: string;
  form: string;
  unit: string;
};

export type PopulatedSupplier = {
  _id: Types.ObjectId;
  name: string;
  returnWindowDays: number;
};
