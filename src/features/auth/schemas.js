import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "Email address is too long.")
  .pipe(z.email("Enter a valid email address."));

// Mirrors the backend's validators for fast feedback. The server re-checks
// everything, including common-password and similarity rules.
const newPassword = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .refine((value) => !/^\d+$/.test(value), "Password can't be entirely numeric.");

const fullName = z
  .string()
  .trim()
  .min(1, "Enter your full name.")
  .max(150, "Name must be 150 characters or fewer.");

const passwordsMatch = (field, confirmField) => (values) => values[field] === values[confirmField];

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z
  .object({
    fullName,
    email,
    password: newPassword,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine(passwordsMatch("password", "confirmPassword"), {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });

export const profileSchema = z.object({ fullName });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine(passwordsMatch("newPassword", "confirmPassword"), {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one.",
  });
