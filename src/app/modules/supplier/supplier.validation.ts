import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2, "Name the supplier").max(120),
  phone: z.string().trim().max(20).default(""),
  email: z.string().trim().toLowerCase().email("Enter a valid email").or(z.literal("")).default(""),
  address: z.string().trim().max(240).default(""),
  returnWindowDays: z.coerce
    .number()
    .int("Whole days only")
    .min(0, "Cannot be negative")
    .max(365, "That window is too long")
    .default(90),
  isActive: z.boolean().default(true),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
