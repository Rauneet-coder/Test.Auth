import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import crypto from "crypto";
import bcrypt from "bcrypt";
import app from "../../src/app.js";
import Usermodel from "../../src/models/user.model.js";
import otpModel from "../../src/models/otp.model.js";

describe("POST /api/auth/verify-email", () => {
    const testUser = {
        username: "verifytestuser",
        email: "verify.test@example.com",
        password: "SecurePassword123!"
    };

    const validOtp = "123456";
    let createdUser;

    beforeAll(async () => {
        // 1. Clean up old test data
        await Usermodel.deleteOne({ email: testUser.email });
        await otpModel.deleteMany({ email: testUser.email });

        // 2. Create unverified user
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        createdUser = await Usermodel.create({
            username: testUser.username,
            email: testUser.email,
            password: hashedPassword,
            verified: false
        });

        // 3. Create valid OTP in DB (expires in 10 minutes)
        const otpHash = crypto.createHash("sha256").update(validOtp).digest("hex");
        await otpModel.create({
            user: createdUser._id,
            email: testUser.email,
            otpHash,
            deletedAt: new Date(Date.now() + 10 * 60 * 1000)
        });
    });

    afterAll(async () => {
        await otpModel.deleteMany({ email: testUser.email });
        await Usermodel.deleteOne({ email: testUser.email });
    });

    // ─── Negative Test 1: Validation Failure (Malformed OTP) ─────────────────
    it("should return 400 if OTP is not 6 numeric digits", async () => {
        const response = await request(app)
            .post("/api/auth/verify-email")
            .send({
                email: testUser.email,
                otp: "123" // Invalid: less than 6 digits
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty("errors");
    });

    // ─── Negative Test 2: Incorrect OTP ──────────────────────────────────────
    it("should return 400 if OTP is incorrect", async () => {
        const response = await request(app)
            .post("/api/auth/verify-email")
            .send({
                email: testUser.email,
                otp: "999999" // Valid format, but wrong OTP
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ message: "Invalid OTP" });
    });

    
    // ─── Negative Test 3: Expired OTP ────────────────────────────────────────
    it("should return 400 if OTP is expired", async () => {
        const expiredOtp = "654321";
        const expiredHash = crypto.createHash("sha256").update(expiredOtp).digest("hex");
        await otpModel.create({
            user: createdUser._id,
            email: testUser.email,
            otpHash: expiredHash,
            deletedAt: new Date(Date.now() - 5 * 60 * 1000)
        });

        const response = await request(app)
            .post("/api/auth/verify-email")
            .send({
                email: testUser.email,
                otp: expiredOtp
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ message: "Invalid OTP" });
    });

    // ─── Positive Test: Correct OTP ──────────────────────────────────────────
    it("should return 200 and mark user as verified", async () => {
        const response = await request(app)
            .post("/api/auth/verify-email")
            .send({
                email: testUser.email,
                otp: validOtp
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Email verified successfully");
        expect(response.body.user.verified).toBe(true);

        // Verify in DB that the user is now verified
        const updatedUser = await Usermodel.findById(createdUser._id);
        expect(updatedUser.verified).toBe(true);
    });
});
