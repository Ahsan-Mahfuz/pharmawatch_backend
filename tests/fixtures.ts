import { addDays, today } from "../src/app/domain";

export const OWNER = {
  name: "Mahmuda Khatun",
  pharmacy: "Shahjalal Pharmacy",
  email: "owner@pharmawatch.test",
  password: "Shahjalal2026",
};

export const PHARMACIST = {
  name: "Rafiq Ahmed",
  email: "rafiq@pharmawatch.test",
  password: "Shahjalal2026",
  role: "pharmacist" as const,
};

export const makeFixtures = async () => {
  const { Supplier } = await import("../src/app/modules/supplier/supplier.model");
  const { Medicine } = await import("../src/app/modules/medicine/medicine.model");
  const { Batch } = await import("../src/app/modules/batch/batch.model");

  const supplier = await Supplier.create({ name: "Beximco Pharma", returnWindowDays: 90 });

  const napa = await Medicine.create({
    name: "Napa Extra",
    generic: "Paracetamol + Caffeine",
    strength: "500mg",
    form: "tablet",
    unit: "strips",
  });

  const seclo = await Medicine.create({
    name: "Seclo",
    generic: "Omeprazole",
    strength: "20mg",
    form: "capsule",
    unit: "caps",
  });

  const base = today();

  const batch = (
    batchNo: string,
    medicine: string,
    qtyIn: number,
    left: number,
    expiryOffset: number,
    cutoffOffset: number,
  ) =>
    Batch.create({
      batchNo,
      medicine,
      supplier: supplier._id,
      qtyIn,
      left,
      cost: 42,
      price: 63,
      received: addDays(base, -120),
      expiry: addDays(base, expiryOffset),
      cutoff: addDays(base, cutoffOffset),
      r30: 0.9,
      r7: 0.4,
    });

  const early = await batch("NPX-4417", String(napa._id), 500, 88, 26, -64);
  const later = await batch("NPX-5102", String(napa._id), 300, 240, 166, 76);
  const newest = await batch("NPX-5533", String(napa._id), 500, 500, 338, 246);
  const expired = await batch("SEC-1180", String(seclo._id), 400, 14, -19, -111);
  const open = await batch("SEC-2210", String(seclo._id), 600, 140, 45, 22);

  return { supplier, napa, seclo, early, later, newest, expired, open };
};
