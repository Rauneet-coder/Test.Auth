import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app.js";
import Usermodel from "../../src/models/user.model.js";
import sessionModel from "../../src/models/session.model.js";

describe("POST /api/auth/refresh-token", () => {
    const testUser = {
        username: "refreshtestuser",
        email: "refresh.test@example.com",
        password: "SecurePassword123!"
    };

    let initialCookies;

    beforeAll(async () => {
        // 1. Clean up old test data
        await Usermodel.deleteOne({ email: testUser.email });

        // 2. Seed a verified user directly into DB
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        const user = await Usermodel.create({
            username: testUser.username,
            email: testUser.email,
            password: hashedPassword,
            verified: true
        });

        // 3. Log in to get initial refresh token cookie
        const loginRes = await request(app)
            .post("/api/auth/login")
            .set("User-Agent", "supertest-agent")
            .send({
                email: testUser.email,
                password: testUser.password
            });

        initialCookies = loginRes.headers["set-cookie"];
    });

    afterAll(async () => {
        const user = await Usermodel.findOne({ email: testUser.email });
        if (user) {
            await sessionModel.deleteMany({ user: user._id });
            await Usermodel.deleteOne({ _id: user._id });
        }
    });

    // ─── Negative Test 1: No Cookie ──────────────────────────────────────────
    it("should return 401 if refresh token cookie is missing", async () => {
        const response = await request(app).post("/api/auth/refresh-token");

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Unauthorized" });
    });

    // ─── Negative Test 2: Invalid or Corrupted Token ─────────────────────────
    it("should return 401 if refresh token is invalid or corrupted", async () => {
    });

    // ─── Positive Test: Refresh Token & Rotation ─────────────────────────────
    let rotatedCookies;
    it("should return 200 and issue a new access token and rotated refresh token", async () => {
        // Wait 1 second so the JWT `iat` (issued-at) second changes, generating a new token hash
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const response = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", initialCookies);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("accessToken");
        expect(response.body.message).toBe("Access token refreshed successfully");

        // Verify that a new refresh token cookie was issued (Token Rotation)
        rotatedCookies = response.headers["set-cookie"];
        expect(rotatedCookies).toBeDefined();
        expect(rotatedCookies[0]).toContain("refreshToken=");
    });

    // ─── Security Test: Token Reuse Prevention ───────────────────────────────
    it("should return 401 if trying to reuse the old, already-rotated refresh token", async () => {
        // Because the initial refresh token was rotated in the previous test,
        // sending it again should be rejected.
        const response = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", initialCookies);

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Invalid or expired refresh token" });
    });

    // ─── Positive Test 2: Using the New Rotated Token ────────────────────────
    it("should return 200 when using the newly rotated refresh token", async () => {
        const response = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", rotatedCookies);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("accessToken");
    });
});
