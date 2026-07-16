import { z } from "zod";
import { normalizeRwandaPhone } from "@/lib/auth/phone";

export const passwordSchema = z
  .string()
  .min(10)
  .max(128)
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[0-9]/, "Add a number");
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
  audience: z.enum(["customer", "staff"]).default("customer"),
});
export const registerSchema = z.object({
  fullName: z.string().trim().min(3).max(160),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().transform((value, context) => {
    const phone = normalizeRwandaPhone(value);
    if (!phone)
      context.addIssue({
        code: "custom",
        message: "Use 07XXXXXXXX, 2507XXXXXXXX, or +2507XXXXXXXX",
      });
    return phone ?? value;
  }),
  password: passwordSchema,
  confirmPassword: z.string().min(1).max(128),
}).superRefine((input, context) => {
  if (input.password !== input.confirmPassword)
    context.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "Passwords do not match",
    });
  if (input.fullName.trim().split(/\s+/).length < 2)
    context.addIssue({
      code: "custom",
      path: ["fullName"],
      message: "Enter your first and last name",
    });
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const verifyResetCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: z.string().trim().regex(/^\d{6}$/),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
    password: passwordSchema,
    confirmPassword: z.string().min(1).max(128),
  })
  .superRefine((input, context) => {
    if (input.password !== input.confirmPassword)
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
  });

export const customerProfileSchema = z.object({
  fullName: z.string().trim().min(3).max(160),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().transform((value, context) => {
    const phone = normalizeRwandaPhone(value);
    if (!phone)
      context.addIssue({
        code: "custom",
        message: "Use 07XXXXXXXX, 2507XXXXXXXX, or +2507XXXXXXXX",
      });
    return phone ?? value;
  }),
}).superRefine((input, context) => {
  if (input.fullName.trim().split(/\s+/).length < 2)
    context.addIssue({ code: "custom", path: ["fullName"], message: "Enter your first and last name" });
});
