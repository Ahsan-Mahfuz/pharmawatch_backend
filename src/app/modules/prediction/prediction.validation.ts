import { z } from "zod";

export const simulateSchema = z.object({
  daysToExpiry: z.coerce.number().int().min(0).max(3650),
  left: z.coerce.number().int().min(0).max(1_000_000),
  qtyIn: z.coerce.number().int().min(1).max(1_000_000),
  unitsPerDay: z.coerce.number().min(0).max(1000),
});
