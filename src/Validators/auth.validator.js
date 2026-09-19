import { z } from "zod";

// ─── Registration Schema ──────────────────────────────────────────────────────
// Strong password rules apply here because this is where the password is SET.
// We enforce complexity so users create a strong password from the start.
export const RegisterSchema = z.object({
    username: z.string()
        .min(3, "Username must be at least 3 characters long")
        .max(30, "Username must be less than 30 characters long"),
    email: z.string().email("Invalid email address"),
    password: z.string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

// ─── Login Schema ─────────────────────────────────────────────────────────────
// Password validation here is deliberately minimal (only min length).
// Reason: complexity rules must NOT be applied at login. A user whose
// password was created before complexity rules were introduced, or whose
// password was set via an admin tool, would be permanently locked out by
// the validator before their credentials even reach the database.
// The database comparison (bcrypt.compare) is the real gate — not Zod.
export const LoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

// ─── Verify OTP Schema ────────────────────────────────────────────────────────
// otp must be EXACTLY 6 numeric digits.
// Using a regex instead of z.string().length(6) because .length(6) would
// also accept "AABBCC" or "abc123" — any 6-character string passes.
// The regex /^\d{6}$/ enforces digits only, closing that gap.
export const VerifyOtpSchema = z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 numeric digits"),
});
