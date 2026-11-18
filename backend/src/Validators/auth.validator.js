import { z } from "zod";

// ─── Registration Schema ──────────────────────────────────────────────────────
export const RegisterSchema = z.object({
    username: z.string()
        .trim()
        .min(3, "Username must be at least 3 characters long")
        .max(30, "Username must be less than 30 characters long"),
    email: z.string().trim().email("Invalid email address").toLowerCase(),
    password: z.string()
        .min(8, "Password must be at least 8 characters long")
        .max(72, "Password must not exceed 72 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

// ─── Login Schema ─────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
    email: z.string().trim().email("Invalid email address").toLowerCase(),
    password: z.string().min(1, "Password is required"),
});

// ─── Verify OTP Schema ────────────────────────────────────────────────────────
export const VerifyOtpSchema = z.object({
    email: z.string().trim().email("Invalid email address").toLowerCase(),
    otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 numeric digits"),
});

// ─── Resend OTP Schema ────────────────────────────────────────────────────────
export const ResendOtpSchema = z.object({
    email: z.string().trim().email("Invalid email address").toLowerCase(),
});
