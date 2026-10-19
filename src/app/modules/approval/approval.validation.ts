import { z } from "zod";
import { ACTION_TYPES } from "./approval.model";

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, "Pick a valid record");

export const requestActionSchema = z.object({
  batch: objectId,
  type: z.enum(ACTION_TYPES),
  reason: z.string().trim().max(240).default(""),
});

export const decideSchema = z.object({
  reason: z.string().trim().max(240).default(""),
});

export type RequestActionInput = z.infer<typeof requestActionSchema>;
