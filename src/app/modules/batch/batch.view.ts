import { Types } from "mongoose";
import { Derived, derive } from "../../domain";
import { PopulatedMedicine, PopulatedSupplier } from "./batch.interface";

export type BatchRow = {
  _id: Types.ObjectId;
  batchNo: string;
  medicine: PopulatedMedicine;
  supplier: PopulatedSupplier;
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
  state: "open" | "returned" | "written-off";
  closedQty: number;
};

export type BatchView = {
  id: string;
  batchNo: string;
  medicine: { id: string; name: string; generic: string; strength: string; form: string };
  supplier: { id: string; name: string; returnWindowDays: number };
  unit: string;
  qtyIn: number;
  left: number;
  cost: number;
  price: number;
  discount: number;
  r30: number;
  r7: number;
  received: string;
  expiry: string;
  cutoff: string;
  state: string;
  closedQty: number;
} & Derived;

export const POPULATE = [
  { path: "medicine", select: "name generic strength form unit" },
  { path: "supplier", select: "name returnWindowDays" },
];

const iso = (value: Date): string => new Date(value).toISOString().slice(0, 10);

export const toView = (row: BatchRow): BatchView => {
  const derived = derive({
    batchNo: row.batchNo,
    unit: row.medicine?.unit ?? "units",
    supplierName: row.supplier?.name ?? "Unknown supplier",
    returnWindowDays: row.supplier?.returnWindowDays ?? 90,
    qtyIn: row.qtyIn,
    left: row.left,
    cost: row.cost,
    price: row.price,
    received: row.received,
    expiry: row.expiry,
    cutoff: row.cutoff,
    r30: row.r30,
    r7: row.r7,
    discount: row.discount,
    state: row.state,
  });

  return {
    id: String(row._id),
    batchNo: row.batchNo,
    medicine: {
      id: String(row.medicine?._id ?? ""),
      name: row.medicine?.name ?? "",
      generic: row.medicine?.generic ?? "",
      strength: row.medicine?.strength ?? "",
      form: row.medicine?.form ?? "",
    },
    supplier: {
      id: String(row.supplier?._id ?? ""),
      name: row.supplier?.name ?? "",
      returnWindowDays: row.supplier?.returnWindowDays ?? 90,
    },
    unit: row.medicine?.unit ?? "units",
    qtyIn: row.qtyIn,
    left: row.left,
    cost: row.cost,
    price: row.price,
    discount: row.discount,
    r30: row.r30,
    r7: row.r7,
    received: iso(row.received),
    expiry: iso(row.expiry),
    cutoff: iso(row.cutoff),
    state: row.state,
    closedQty: row.closedQty,
    ...derived,
  };
};
