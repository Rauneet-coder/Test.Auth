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
            deletedAt: new Date(Date.now() - 5 * 60 * 1000) // Expired 5 minutes ago
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

    // ─── Security Test: Attempt limit tracking and lockout/expiry ────────────
    it("should track failed attempts and lock out/expire OTP after max attempts", async () => {
        const lockoutUser = {
            username: "lockoutuser",
            email: "lockout.test@example.com",
            password: "SecurePassword123!"
        };
        const correctCode = "456789";

        // Seed unverified user
        await Usermodel.deleteOne({ email: lockoutUser.email });
        await otpModel.deleteMany({ email: lockoutUser.email });
        const hashedPassword = await bcrypt.hash(lockoutUser.password, 10);
        const user = await Usermodel.create({
            username: lockoutUser.username,
            email: lockoutUser.email,
            password: hashedPassword,
            verified: false
        });

        // Seed OTP with maxAttempts: 5
        const otpHash = crypto.createHash("sha256").update(correctCode).digest("hex");
        await otpModel.create({
            user: user._id,
            email: lockoutUser.email,
            otpHash,
            failedAttempts: 0,
            maxAttempts: 5,
            deletedAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        // 1. Submit 4 incorrect attempts -> each should return 400 Invalid OTP
        for (let i = 1; i <= 4; i++) {
            const res = await request(app)
                .post("/api/auth/verify-email")
                .send({
                    email: lockoutUser.email,
                    otp: "000000"
                });
            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({ message: "Invalid OTP" });

            const doc = await otpModel.findOne({ email: lockoutUser.email });
            expect(doc).toBeDefined();
            expect(doc.failedAttempts).toBe(i);
        }

        // 2. Submit 5th incorrect attempt -> triggers lockout/expiry
        const lockoutRes = await request(app)
            .post("/api/auth/verify-email")
            .send({
                email: lockoutUser.email,
                otp: "000000"
            });
        expect(lockoutRes.statusCode).toBe(400);
        expect(lockoutRes.body).toEqual({ message: "Too many failed attempts. OTP has expired." });

        // OTP record should now be deleted / invalidated
        const expiredDoc = await otpModel.findOne({ email: lockoutUser.email });
        expect(expiredDoc).toBeNull();

        // 3. Even presenting the CORRECT code after lockout must be rejected
        const correctAfterLockout = await request(app)
            .post("/api/auth/verify-email")
            .send({
                email: lockoutUser.email,
                otp: correctCode
            });
        expect(correctAfterLockout.statusCode).toBe(400);

        // Clean up
        await Usermodel.deleteOne({ _id: user._id });
    });
});
