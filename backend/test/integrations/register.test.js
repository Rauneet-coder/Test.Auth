import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// ─── Mock email service before app import ────────────────────────────────────
vi.mock("../../src/services/email.service.js", () => ({
    sendEmail: vi.fn().mockResolvedValue(undefined)
}));

import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app.js";
import Usermodel from "../../src/models/user.model.js";
import otpModel from "../../src/models/otp.model.js";
import { sendEmail } from "../../src/services/email.service.js";

describe("POST /api/auth/register", () => {
    const validUser = {
        username: "uniqueuser123",
        email: "unique.testuser@example.com",
        password: "SecurePassword123!"
    };

    beforeAll(async () => {
        await Usermodel.deleteMany({
            $or: [
                { email: validUser.email },
                { username: validUser.username }
            ]
        });
    });

    afterAll(async () => {
        await Usermodel.deleteMany({
            $or: [
                { email: validUser.email },
                { username: validUser.username },
                { email: "another.user@example.com" }
            ]
        });
    });

    // ─── P0: Register with valid input ───────────────────────────────────────
    it("should return 201 if user is registered successfully", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send(validUser);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty("message", "User registered successfully");
        expect(response.body).toHaveProperty("user");
        expect(response.body.user.username).toBe(validUser.username);
        expect(response.body.user.email).toBe(validUser.email);
        expect(response.body.user.verified).toBe(false);
    });

    // ─── P0: Register duplicate email/username ────────────────────────────────
    it("should return 409 if email already exists", async () => {
        // Ensure validUser exists before checking duplicate
        await request(app).post("/api/auth/register").send(validUser);

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                username: "differentusername",
                email: validUser.email,
                password: "SecurePassword123!"
            });

        expect(response.statusCode).toBe(409);
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "RESOURCE_CONFLICT",
                message: "User already exists",
                requestId: expect.any(String)
            }
        });
    });

    it("should reject duplicate registration with case-insensitive email matching", async () => {
        await request(app).post("/api/auth/register").send(validUser);

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                username: "differentusercase",
                email: validUser.email.toUpperCase(),
                password: "SecurePassword123!"
            });

        expect(response.statusCode).toBe(409);
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "RESOURCE_CONFLICT",
                message: "User already exists",
                requestId: expect.any(String)
            }
        });
    });

    it("should return 409 if username already exists", async () => {
        // Ensure validUser exists before checking duplicate
        await request(app).post("/api/auth/register").send(validUser);

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                username: validUser.username,
                email: "another.user@example.com",
                password: "SecurePassword123!"
            });

        expect(response.statusCode).toBe(409);
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "RESOURCE_CONFLICT",
                message: "User already exists",
                requestId: expect.any(String)
            }
        });
    });

    // ─── P0: Invalid registration data (Validation errors) ───────────────────
    describe("Validation Errors", () => {
        it("should return 400 validation error if required fields are missing", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({});

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
            expect(response.body.error.message).toBe("Request validation failed");
            expect(Array.isArray(response.body.error.details)).toBe(true);
            expect(response.body.error.details.length).toBeGreaterThan(0);
        });

        it("should return 400 validation error if email format is invalid", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    username: "validusername",
                    email: "invalid-email-format",
                    password: "SecurePassword123!"
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
            expect(Array.isArray(response.body.error.details)).toBe(true);
            const emailError = response.body.error.details.find((e) => e.field === "email");
            expect(emailError).toBeDefined();
        });

        it("should return 400 validation error if username is too short (< 3 chars)", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    username: "ab",
                    email: "valid@example.com",
                    password: "SecurePassword123!"
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
            expect(Array.isArray(response.body.error.details)).toBe(true);
            const usernameError = response.body.error.details.find((e) => e.field === "username");
            expect(usernameError).toBeDefined();
        });

        it("should return 400 validation error if password lacks uppercase, number, or special char", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    username: "validusername",
                    email: "valid@example.com",
                    password: "weakpassword123"
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
            expect(Array.isArray(response.body.error.details)).toBe(true);
            const passwordError = response.body.error.details.find((e) => e.field === "password");
            expect(passwordError).toBeDefined();
        });

        it("should return 400 validation error if password exceeds 72 characters", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    username: "validusername",
                    email: "valid@example.com",
                    password: "A1!" + "a".repeat(70) // 73 chars
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
            expect(Array.isArray(response.body.error.details)).toBe(true);
            const passwordError = response.body.error.details.find((e) => e.field === "password");
            expect(passwordError).toBeDefined();
            expect(passwordError.message).toContain("72 characters");
        });
    });

    // ─── P2: Password hashing (Self-contained) ───────────────────────────────
    it("should securely hash password with bcrypt and never store plaintext in database", async () => {
        const hashTestUser = {
            username: "hashtestuser",
            email: "hash.test@example.com",
            password: "HashPassword123!"
        };
        await Usermodel.deleteOne({ email: hashTestUser.email });

        await request(app)
            .post("/api/auth/register")
            .send(hashTestUser);

        const savedUser = await Usermodel.findOne({ email: hashTestUser.email });
        expect(savedUser).toBeDefined();

        // 1. Password must NEVER equal the plaintext password
        expect(savedUser.password).not.toBe(hashTestUser.password);

        // 2. Password must match standard bcrypt hash format ($2a$ or $2b$)
        expect(savedUser.password).toMatch(/^\$2[ab]\$\d{2}\$/);

        // 3. bcrypt.compare must verify the raw password against the hash
        const isMatch = await bcrypt.compare(hashTestUser.password, savedUser.password);
        expect(isMatch).toBe(true);

        await Usermodel.deleteOne({ email: hashTestUser.email });
    });

    // ─── Registration Failure Rollback & Email Error Propagation ─────────────
    it("should return 500, propagate email failure, and clean up unverified user without leaving zombies", async () => {
        sendEmail.mockRejectedValueOnce(new Error("SMTP connection refused"));
        const failUser = {
            username: "failuser",
            email: "fail.user@example.com",
            password: "SecurePassword123!"
        };
        await Usermodel.deleteOne({ email: failUser.email });
        await otpModel.deleteMany({ email: failUser.email });

        const response = await request(app)
            .post("/api/auth/register")
            .send(failUser);

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification email",
                requestId: expect.any(String)
            }
        });

        // Assert that the user was rolled back and NOT left behind
        const userInDb = await Usermodel.findOne({ email: failUser.email });
        expect(userInDb).toBeNull();

        // Assert that OTP was cleaned up
        const otpInDb = await otpModel.findOne({ email: failUser.email });
        expect(otpInDb).toBeNull();
    });

    // ─── Registration Recovery ──────────────────────────────────────────────
    it("should allow an unverified user to recover their registration and receive a new OTP", async () => {
        sendEmail.mockResolvedValue(undefined);
        const recoveryUser = {
            username: "recoveryuser",
            email: "recovery.user@example.com",
            password: "SecurePassword123!"
        };
        await Usermodel.deleteOne({ email: recoveryUser.email });
        await otpModel.deleteMany({ email: recoveryUser.email });

        // Initial registration
        const res1 = await request(app)
            .post("/api/auth/register")
            .send(recoveryUser);
        expect(res1.statusCode).toBe(201);

        // User didn't verify, then registers again with updated password
        const res2 = await request(app)
            .post("/api/auth/register")
            .send({
                username: recoveryUser.username,
                email: recoveryUser.email,
                password: "NewSecurePassword456!"
            });

        expect(res2.statusCode).toBe(201);
        expect(res2.body).toHaveProperty("message", "User registered successfully");

        const updatedUser = await Usermodel.findOne({ email: recoveryUser.email });
        expect(updatedUser.verified).toBe(false);
        const passwordMatches = await bcrypt.compare("NewSecurePassword456!", updatedUser.password);
        expect(passwordMatches).toBe(true);

        await Usermodel.deleteOne({ email: recoveryUser.email });
        await otpModel.deleteMany({ email: recoveryUser.email });
    });
});
