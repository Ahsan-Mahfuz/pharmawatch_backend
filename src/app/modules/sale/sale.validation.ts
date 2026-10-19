import { z } from "zod";

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, "Pick a valid record");

export const createSaleSchema = z.object({
  customerName: z.string().trim().max(120).default(""),
  items: z
    .array(
      z.object({
        medicine: objectId,
        qty: z.coerce.number().int("Whole units only").positive("Must be more than 0"),
      }),
    )
    .min(1, "Add at least one medicine"),
});

export const fefoQuerySchema = z.object({
  medicineId: objectId,
  quantity: z.coerce.number().int().positive().default(1),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
