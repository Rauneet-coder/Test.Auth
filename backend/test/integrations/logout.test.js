import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app.js";
import Usermodel from "../../src/models/user.model.js";
import sessionModel from "../../src/models/session.model.js";

describe("POST /api/auth/logout", () => {
    const testUser = {
        username: "logouttestuser",
        email: "logout.test@example.com",
        password: "SecurePassword123!"
    };

    let userCookies;

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

        // 3. Log in to get a valid refreshToken cookie
        const loginRes = await request(app)
            .post("/api/auth/login")
            .set("User-Agent", "supertest-agent")
            .send({
                email: testUser.email,
                password: testUser.password
            });

        // Store the Set-Cookie array for tests
        userCookies = loginRes.headers["set-cookie"];
    });

    afterAll(async () => {
        // Clean up test user and sessions
        const user = await Usermodel.findOne({ email: testUser.email });
        if (user) {
            await sessionModel.deleteMany({ user: user._id });
            await Usermodel.deleteOne({ _id: user._id });
        }
    });

    // ─── Negative Test 1: No Cookie ──────────────────────────────────────────
    it("should return 401 if refreshToken cookie is missing", async () => {
        const response = await request(app).post("/api/auth/logout");

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Already logout!" });
    });

    // ─── Positive Test: Successful Logout ────────────────────────────────────
    it("should return 200 and clear the cookie on successful logout", async () => {
        const response = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", userCookies); // Pass the cookie received during login

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ message: "User logged out successfully" });

        // Verify the server commanded the browser to clear the cookie
        const clearCookieHeader = response.headers["set-cookie"]?.[0] || "";
        expect(clearCookieHeader).toContain("refreshToken=");
    });

    // ─── Negative Test 2: Reusing Revoked Token ──────────────────────────────
    it("should return 401 if trying to logout again with the already revoked token", async () => {
        // Since the previous test revoked this session, repeating it should fail
        const response = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", userCookies);

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Invalid or expired refresh token" });
    });

    // ─── Tests for POST /api/auth/logout-all ─────────────────────────────────
    it("should return 400 on logout-all if refreshToken cookie is missing", async () => {
        const response = await request(app).post("/api/auth/logout-all");

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ message: "Refresh token not found" });
    });

    it("should return 200 and revoke sessions on logout-all", async () => {
        // Log in again to obtain a fresh session
        const loginRes = await request(app)
            .post("/api/auth/login")
            .set("User-Agent", "supertest-agent")
            .send({
                email: testUser.email,
                password: testUser.password
            });

        const activeCookie = loginRes.headers["set-cookie"];

        const response = await request(app)
            .post("/api/auth/logout-all")
            .set("Cookie", activeCookie);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ message: "Logged out from all devices successfully" });
    });
});
