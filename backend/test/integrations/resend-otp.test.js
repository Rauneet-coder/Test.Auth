import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock email service
vi.mock("../../src/services/email.service.js", () => ({
    sendEmail: vi.fn().mockResolvedValue(undefined)
}));

import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app.js";
import Usermodel from "../../src/models/user.model.js";
import otpModel from "../../src/models/otp.model.js";
import { sendEmail } from "../../src/services/email.service.js";

describe("POST /api/auth/resend-otp and Database Uniqueness", () => {
    const unverifiedUser = {
        username: "resendtestuser",
        email: "resend.test@example.com",
        password: "SecurePassword123!"
    };

    const verifiedUser = {
        username: "verifiedresenduser",
        email: "verified.resend@example.com",
        password: "SecurePassword123!"
    };

    beforeAll(async () => {
        await Usermodel.deleteMany({
            email: { $in: [unverifiedUser.email, verifiedUser.email] }
        });
        await otpModel.deleteMany({
            email: { $in: [unverifiedUser.email, verifiedUser.email] }
        });

        const hashedPassword = await bcrypt.hash(unverifiedUser.password, 10);
        await Usermodel.create({
            username: unverifiedUser.username,
            email: unverifiedUser.email,
            password: hashedPassword,
            verified: false
        });

        await Usermodel.create({
            username: verifiedUser.username,
            email: verifiedUser.email,
            password: hashedPassword,
            verified: true
        });
    });

    afterAll(async () => {
        await Usermodel.deleteMany({
            email: { $in: [unverifiedUser.email, verifiedUser.email] }
        });
        await otpModel.deleteMany({
            email: { $in: [unverifiedUser.email, verifiedUser.email] }
        });
    });

    it("should return 400 validation error if email is invalid", async () => {
        const response = await request(app)
            .post("/api/auth/resend-otp")
            .send({ email: "not-an-email" });

        expect(response.statusCode).toBe(400);
        expect(response.body).toMatchObject({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Request validation failed",
                details: expect.any(Array),
                requestId: expect.any(String)
            }
        });
    });

    it("should return 404 if email does not belong to any user", async () => {
        const response = await request(app)
            .post("/api/auth/resend-otp")
            .send({ email: "nonexistent@example.com" });

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "RESOURCE_NOT_FOUND",
                message: "User not found",
                requestId: expect.any(String)
            }
        });
    });

    it("should return 400 if user email is already verified", async () => {
        const response = await request(app)
            .post("/api/auth/resend-otp")
            .send({ email: verifiedUser.email });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "RESOURCE_CONFLICT",
                message: "Email already verified",
                requestId: expect.any(String)
            }
        });
    });

    it("should return 200 and generate a new OTP for an unverified user", async () => {
        sendEmail.mockResolvedValueOnce(undefined);

        const response = await request(app)
            .post("/api/auth/resend-otp")
            .send({ email: unverifiedUser.email });

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ message: "Verification code sent successfully" });

        const otpInDb = await otpModel.findOne({ email: unverifiedUser.email });
        expect(otpInDb).toBeDefined();
        expect(otpInDb.failedAttempts).toBe(0);
        expect(sendEmail).toHaveBeenCalled();
    });

    it("should invalidate old OTPs upon resending", async () => {
        sendEmail.mockResolvedValue(undefined);

        // First resend
        await request(app)
            .post("/api/auth/resend-otp")
            .send({ email: unverifiedUser.email });

        const firstOtp = await otpModel.findOne({ email: unverifiedUser.email });

        // Second resend
        await request(app)
            .post("/api/auth/resend-otp")
            .send({ email: unverifiedUser.email });

        const otps = await otpModel.find({ email: unverifiedUser.email });
        // Only the newest OTP should be active
        expect(otps.length).toBe(1);
        expect(otps[0]._id.toString()).not.toBe(firstOtp._id.toString());
    });

    it("should return 500 and clean up OTP if email sending fails during resend", async () => {
        sendEmail.mockRejectedValueOnce(new Error("Email provider offline"));

        const response = await request(app)
            .post("/api/auth/resend-otp")
            .send({ email: unverifiedUser.email });

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification email",
                requestId: expect.any(String)
            }
        });

        const otpInDb = await otpModel.findOne({ email: unverifiedUser.email });
        expect(otpInDb).toBeNull();
    });

    it("should enforce uniqueness at the database level on duplicate email", async () => {
        // Ensure unique indexes are built on the model
        await Usermodel.init();

        // Attempting to directly insert a duplicate email into Usermodel must be rejected by unique index
        await expect(
            Usermodel.create({
                username: "differentuserunique",
                email: unverifiedUser.email, // duplicate
                password: "hashedpassword123"
            })
        ).rejects.toThrow();
    });

    it("should reject rapid resend requests with 429 when cooldown is active", async () => {
        process.env.OTP_RESEND_COOLDOWN_SECONDS = "60";
        try {
            // First resend succeeds
            const first = await request(app)
                .post("/api/auth/resend-otp")
                .send({ email: unverifiedUser.email });
            expect(first.statusCode).toBe(200);

            // Immediate second resend is rate-limited by cooldown
            const second = await request(app)
                .post("/api/auth/resend-otp")
                .send({ email: unverifiedUser.email });
            expect(second.statusCode).toBe(429);
            expect(second.body).toEqual({
                success: false,
                error: {
                    code: "RATE_LIMIT_EXCEEDED",
                    message: expect.stringContaining("Please wait 60 seconds"),
                    requestId: expect.any(String)
                }
            });
        } finally {
            delete process.env.OTP_RESEND_COOLDOWN_SECONDS;
        }
    });
});

