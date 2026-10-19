import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address");

const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "That password is too long")
  .refine((value) => /[a-z]/.test(value), "Include a lower case letter")
  .refine((value) => /[A-Z]/.test(value), "Include an upper case letter")
  .refine((value) => /\d/.test(value), "Include a number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  pharmacy: z.string().trim().min(2, "Name the pharmacy").max(120),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional().default(false),
});

export const forgotSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10, "Start the reset again"),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  password,
});

export const addStaffSchema = z.object({
  name: z.string().trim().min(2, "Enter their full name").max(80),
  email,
  password,
  role: z.enum(["owner", "pharmacist"]).default("pharmacist"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AddStaffInput = z.infer<typeof addStaffSchema>;
