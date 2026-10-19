import mongoose from "mongoose";
import config from "../config";
import { addDays, today } from "../domain";
import { StockAction } from "../modules/approval/approval.model";
import { Activity } from "../modules/activity/activity.model";
import { Batch } from "../modules/batch/batch.model";
import { Medicine } from "../modules/medicine/medicine.model";
import { Sale } from "../modules/sale/sale.model";
import { Supplier } from "../modules/supplier/supplier.model";
import { User } from "../modules/user/user.model";
import { Counter } from "./counter.model";

type SupplierSeed = [name: string, returnWindowDays: number, phone: string];

const SUPPLIERS: SupplierSeed[] = [
  ["Square Pharma", 90, "01711000001"],
  ["Beximco Pharma", 90, "01711000002"],
  ["Incepta", 120, "01711000003"],
  ["Renata", 60, "01711000004"],
  ["Healthcare Pharma", 90, "01711000005"],
  ["Eskayef", 90, "01711000006"],
  ["Novo Nordisk", 60, "01711000007"],
];

type MedicineSeed = [
  name: string,
  generic: string,
  strength: string,
  form: "tablet" | "capsule" | "syrup" | "injection" | "ointment" | "inhaler",
  unit: string,
  manufacturer: string,
];

const MEDICINES: MedicineSeed[] = [
  ["Ventolin Inhaler", "Salbutamol", "100mcg", "inhaler", "inhalers", "Square Pharma"],
  ["Napa Extra", "Paracetamol + Caffeine", "500mg", "tablet", "strips", "Beximco Pharma"],
  ["Seclo", "Omeprazole", "20mg", "capsule", "caps", "Incepta"],
  ["Monas", "Montelukast", "10mg", "tablet", "strips", "Beximco Pharma"],
  ["Fexo", "Fexofenadine", "120mg", "tablet", "strips", "Square Pharma"],
  ["Maxpro", "Esomeprazole", "20mg", "capsule", "caps", "Renata"],
  ["Cef-3", "Cefixime", "200mg", "capsule", "caps", "Incepta"],
  ["Sergel", "Esomeprazole", "20mg", "capsule", "caps", "Healthcare Pharma"],
  ["Losectil", "Omeprazole", "20mg", "capsule", "caps", "Eskayef"],
  ["Alatrol", "Cetirizine", "10mg", "tablet", "strips", "Square Pharma"],
  ["Rolac", "Ketorolac", "10mg", "tablet", "strips", "Renata"],
  ["Azithrocin", "Azithromycin", "500mg", "tablet", "strips", "Beximco Pharma"],
  ["Mixtard 30", "Human insulin", "100IU/ml", "injection", "vials", "Novo Nordisk"],
];

type BatchSeed = [
  batchNo: string,
  medicine: string,
  supplier: string,
  qtyIn: number,
  left: number,
  cost: number,
  price: number,
  receivedOffset: number,
  expiryOffset: number,
  cutoffOffset: number,
  r30: number,
  r7: number,
];

const BATCHES: BatchSeed[] = [
  ["VNT-0917", "Ventolin Inhaler", "Square Pharma", 60, 12, 320, 400, -343, 18, -96, 0.25, 0.14],
  ["NPX-4417", "Napa Extra", "Beximco Pharma", 500, 88, 42, 63, -249, 26, -64, 0.9, 0.4],
  ["NPX-5102", "Napa Extra", "Beximco Pharma", 300, 240, 42, 63, -110, 166, 76, 1.1, 1.4],
  ["NPX-5533", "Napa Extra", "Beximco Pharma", 500, 500, 42, 63, -14, 338, 246, 1.6, 1.5],
  ["SEC-2210", "Seclo", "Incepta", 600, 140, 20, 30, -272, 45, 22, 2.1, 1.6],
  ["SEC-1180", "Seclo", "Incepta", 400, 14, 20, 30, -383, -19, -111, 0, 0],
  ["MON-8803", "Monas", "Beximco Pharma", 200, 64, 110, 150, -232, 64, 42, 0.7, 0.5],
  ["FXO-5521", "Fexo", "Square Pharma", 400, 210, 10, 15, -260, 93, 32, 1.8, 2.2],
  ["MXP-3390", "Maxpro", "Renata", 300, 18, 63, 84, -413, -18, -110, 0, 0],
  ["CEF-7741", "Cef-3", "Incepta", 500, 302, 35, 45, -168, 168, 78, 2.4, 2.6],
  ["SRG-6610", "Sergel", "Healthcare Pharma", 500, 380, 6, 7, -131, 118, 56, 3.5, 3.9],
  ["LSC-2044", "Losectil", "Eskayef", 300, 120, 4.5, 6, -201, 142, 52, 0.6, 0.3],
  ["ALT-3307", "Alatrol", "Square Pharma", 300, 260, 25, 35, -79, 254, 162, 1.5, 1.7],
  ["RLC-1902", "Rolac", "Renata", 150, 70, 60, 80, -218, 78, -14, 0.5, 0.3],
  ["AZT-4471", "Azithrocin", "Beximco Pharma", 120, 45, 105, 140, -152, 213, 124, 0.3, 0.4],
  ["MXT-0710", "Mixtard 30", "Novo Nordisk", 40, 22, 480, 560, -65, 132, 42, 0.4, 0.3],
];

export const seedPharmacy = async () => {

  await Promise.all([
    User.deleteMany({}),
    Supplier.deleteMany({}),
    Medicine.deleteMany({}),
    Batch.deleteMany({}),
    Sale.deleteMany({}),
    StockAction.deleteMany({}),
    Activity.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  const owner = await User.create({
    name: config.owner.name,
    email: config.owner.email,
    password: config.owner.password,
    pharmacy: config.pharmacy,
    role: "owner",
  });

  const pharmacist = await User.create({
    name: "Rafiq Ahmed",
    email: "rafiq@pharmawatch.test",
    password: config.owner.password,
    pharmacy: config.pharmacy,
    role: "pharmacist",
  });

  const suppliers = await Supplier.insertMany(
    SUPPLIERS.map(([name, returnWindowDays, phone]) => ({ name, returnWindowDays, phone })),
  );
  const supplierByName = new Map(suppliers.map((row) => [row.name, row]));

  const medicines = await Medicine.insertMany(
    MEDICINES.map(([name, generic, strength, form, unit, manufacturer]) => ({
      name,
      generic,
      strength,
      form,
      unit,
      manufacturer,
    })),
  );
  const medicineByName = new Map(medicines.map((row) => [row.name, row]));

  const base = today();

  const batches = await Batch.insertMany(
    BATCHES.map((row) => {
      const [
        batchNo,
        medicineName,
        supplierName,
        qtyIn,
        left,
        cost,
        price,
        receivedOffset,
        expiryOffset,
        cutoffOffset,
        r30,
        r7,
      ] = row;

      return {
        batchNo,
        medicine: medicineByName.get(medicineName)!._id,
        supplier: supplierByName.get(supplierName)!._id,
        qtyIn,
        left,
        cost,
        price,
        received: addDays(base, receivedOffset),
        expiry: addDays(base, expiryOffset),
        cutoff: addDays(base, cutoffOffset),
        r30,
        r7,
        createdBy: owner._id,
      };
    }),
  );

  const batchByNo = new Map(batches.map((row) => [row.batchNo, row]));

  await StockAction.insertMany([
    {
      requestNo: "REQ-311",
      type: "RETURN_TO_SUPPLIER",
      batch: batchByNo.get("MON-8803")!._id,
      batchNo: "MON-8803",
      medicineName: "Monas",
      qty: 64,
      unit: "strips",
      value: 7040,
      reason: "Slow moving, window closes in six weeks",
      requestedBy: pharmacist._id,
      requestedByName: pharmacist.name,
    },
    {
      requestNo: "REQ-312",
      type: "WRITE_OFF",
      batch: batchByNo.get("SEC-1180")!._id,
      batchNo: "SEC-1180",
      medicineName: "Seclo",
      qty: 14,
      unit: "caps",
      value: 280,
      reason: "Expired on the shelf",
      requestedBy: pharmacist._id,
      requestedByName: pharmacist.name,
    },
    {
      requestNo: "REQ-313",
      type: "WRITE_OFF",
      batch: batchByNo.get("MXP-3390")!._id,
      batchNo: "MXP-3390",
      medicineName: "Maxpro",
      qty: 18,
      unit: "caps",
      value: 1134,
      reason: "Expired on the shelf",
      requestedBy: pharmacist._id,
      requestedByName: pharmacist.name,
    },
  ]);

  const napa = batchByNo.get("NPX-4417")!;
  const ventolin = batchByNo.get("VNT-0917")!;

  await Sale.insertMany([
    {
      invoiceNo: "INV-10421",
      soldBy: pharmacist._id,
      soldByName: pharmacist.name,
      total: 126,
      fullTotal: 126,
      items: [
        {
          batch: napa._id,
          batchNo: napa.batchNo,
          medicine: napa.medicine,
          medicineName: "Napa Extra",
          unit: "strips",
          qty: 2,
          unitPrice: 63,
          fullPrice: 63,
          discount: 0,
          lineTotal: 126,
        },
      ],
    },
    {
      invoiceNo: "INV-10422",
      soldBy: owner._id,
      soldByName: owner.name,
      total: 400,
      fullTotal: 400,
      items: [
        {
          batch: ventolin._id,
          batchNo: ventolin.batchNo,
          medicine: ventolin.medicine,
          medicineName: "Ventolin Inhaler",
          unit: "inhalers",
          qty: 1,
          unitPrice: 400,
          fullPrice: 400,
          discount: 0,
          lineTotal: 400,
        },
      ],
    },
  ]);

  await Counter.insertMany([
    { _id: "invoice", seq: 10422 },
    { _id: "stock-action", seq: 313 },
  ]);

  await Activity.insertMany([
    { kind: "event", text: "Nightly risk scoring finished for 16 batches", tone: "muted" },
    {
      kind: "event",
      text: "Rafiq Ahmed asked to return MON-8803 to Beximco Pharma",
      tone: "near",
    },
    { kind: "event", text: "Rafiq Ahmed asked to write off SEC-1180 · 14 caps", tone: "expired" },
  ]);

  return {
    suppliers: suppliers.length,
    medicines: medicines.length,
    batches: batches.length,
    owner: owner.email,
    pharmacist: pharmacist.email,
    password: config.owner.password,
  };

};

const run = async () => {
  await mongoose.connect(config.database_url);
  const result = await seedPharmacy();
  console.log(`Seeded ${result.suppliers} suppliers, ${result.medicines} medicines, ${result.batches} batches`);
  console.log(`Owner      ${result.owner} / ${result.password}`);
  console.log(`Pharmacist ${result.pharmacist} / ${result.password}`);
  await mongoose.connection.close();
};

if (require.main === module) {
  run().catch(async (error) => {
    console.error("Seed failed", error);
    await mongoose.connection.close().catch(() => undefined);
    process.exit(1);
  });
}
