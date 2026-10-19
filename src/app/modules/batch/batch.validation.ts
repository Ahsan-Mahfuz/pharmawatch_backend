import { z } from "zod";

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, "Pick a valid record");
const money = z.coerce.number().positive("Must be more than 0");
const day = z.coerce.date({ invalid_type_error: "Use a date" });

export const createBatchSchema = z
  .object({
    batchNo: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2,4}-\d{3,5}$/, "Looks like ABC-1234"),
    medicine: objectId,
    supplier: objectId,
    qtyIn: z.coerce.number().int("Whole units only").positive("Must be more than 0"),
    cost: money,
    price: money,
    received: day.optional(),
    expiry: day,
    cutoff: day.optional(),
  })
  .refine((v) => v.price >= v.cost, {
    path: ["price"],
    message: "Selling below cost — check the figures",
  })
  .refine((v) => !v.received || v.received < v.expiry, {
    path: ["expiry"],
    message: "A batch cannot expire before it arrives",
  })
  .refine((v) => !v.cutoff || v.cutoff <= v.expiry, {
    path: ["cutoff"],
    message: "The return window must close before expiry",
  });

export const updateBatchSchema = z.object({
  cost: money.optional(),
  price: money.optional(),
  expiry: day.optional(),
  cutoff: day.optional(),
  r30: z.coerce.number().min(0).optional(),
  r7: z.coerce.number().min(0).optional(),
});

export const discountSchema = z.object({
  percent: z.coerce
    .number()
    .int("Whole percentages only")
    .min(0, "Cannot be negative")
    .max(90, "That discount is too deep"),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type DiscountInput = z.infer<typeof discountSchema>;
