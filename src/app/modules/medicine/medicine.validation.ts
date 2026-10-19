import { z } from "zod";
import { FORMS } from "./medicine.model";

export const createMedicineSchema = z.object({
  name: z.string().trim().min(2, "Name the medicine").max(120),
  generic: z.string().trim().min(2, "Name the generic").max(120),
  strength: z.string().trim().max(40).default(""),
  form: z.enum(FORMS).default("tablet"),
  manufacturer: z.string().trim().max(120).default(""),
  unit: z.string().trim().min(2, "Pick a unit").max(20).default("strips"),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateMedicineSchema = createMedicineSchema.partial();

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
