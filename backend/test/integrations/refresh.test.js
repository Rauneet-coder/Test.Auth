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

    let userDoc;

    beforeAll(async () => {
        await Usermodel.deleteOne({ email: testUser.email });

        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        userDoc = await Usermodel.create({
            username: testUser.username,
            email: testUser.email,
            password: hashedPassword,
            verified: true
        });
    });

    afterAll(async () => {
        if (userDoc) {
            await sessionModel.deleteMany({ user: userDoc._id });
            await Usermodel.deleteOne({ _id: userDoc._id });
        }
    });

    // Helper to get fresh login cookies for isolated, self-contained tests
    async function getFreshLoginCookies() {
        const loginRes = await request(app)
            .post("/api/auth/login")
            .set("User-Agent", "supertest-agent")
            .send({
                email: testUser.email,
                password: testUser.password
            });
        return {
            cookies: loginRes.headers["set-cookie"],
            accessToken: loginRes.body.accessToken
        };
    }

    // ─── Negative Test 1: No Cookie ──────────────────────────────────────────
    it("should return 401 if refresh token cookie is missing", async () => {
        const response = await request(app).post("/api/auth/refresh-token");

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Unauthorized" });
    });

    // ─── Negative Test 2: Invalid or Corrupted Token ─────────────────────────
    it("should return 401 if refresh token is invalid or corrupted", async () => {
        const response = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", ["refreshToken=invalid.corrupted.jwttoken"]);

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Invalid or expired refresh token" });
    });

    // ─── Negative Test 3: Token Type Enforcement (tokenUse claim) ───────────
    it("should return 401 if an access token is passed as a refresh token", async () => {
        const { accessToken } = await getFreshLoginCookies();

        const response = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", [`refreshToken=${accessToken}`]);

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Invalid or expired refresh token" });
    });

    it("should return 401 if refresh token lacks required tokenUse: refresh claim", async () => {
        const jwt = (await import("jsonwebtoken")).default;
        const config = (await import("../../src/config/config.js")).default;
        const tokenWithoutUse = jwt.sign({ id: userDoc._id, jti: "test-jti" }, config.JWT_SECRET, { expiresIn: "7d" });

        const response = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", [`refreshToken=${tokenWithoutUse}`]);

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Invalid or expired refresh token" });
    });

    // ─── Positive Test: Refresh Token & Rotation (Without Artificial Delays) ─
    it("should return 200 and issue a new access token and uniquely rotated refresh token", async () => {
        const { cookies: initialCookies } = await getFreshLoginCookies();

        const response = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", initialCookies);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("accessToken");
        expect(response.body.message).toBe("Access token refreshed successfully");

        const rotatedCookies = response.headers["set-cookie"];
        expect(rotatedCookies).toBeDefined();
        expect(rotatedCookies[0]).toContain("refreshToken=");

        // Verify the newly rotated token is cryptographically distinct from the original
        expect(rotatedCookies[0]).not.toBe(initialCookies[0]);
    });

    // ─── Security Test: Token Reuse Prevention (Self-contained) ──────────────
    it("should return 401 if trying to reuse an old, already-rotated refresh token", async () => {
        const { cookies: initialCookies } = await getFreshLoginCookies();

        // 1. Rotate the initial token once
        const rotateRes = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", initialCookies);
        expect(rotateRes.statusCode).toBe(200);

        // 2. Attempt to reuse the superseded initial token
        const reuseRes = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", initialCookies);

        expect(reuseRes.statusCode).toBe(401);
        expect(reuseRes.body).toEqual({ message: "Invalid or expired refresh token" });
    });

    // ─── Positive Test 2: Using the New Rotated Token (Self-contained) ───────
    it("should return 200 when using the newly rotated refresh token", async () => {
        const { cookies: initialCookies } = await getFreshLoginCookies();

        // 1. Rotate token
        const rotateRes = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", initialCookies);
        expect(rotateRes.statusCode).toBe(200);
        const rotatedCookies = rotateRes.headers["set-cookie"];

        // 2. Use rotated token for another refresh
        const secondRefreshRes = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", rotatedCookies);

        expect(secondRefreshRes.statusCode).toBe(200);
        expect(secondRefreshRes.body).toHaveProperty("accessToken");
    });

    // ─── Concurrency Test: Atomic Rotation ──────────────────────────────────
    it("should atomically rotate refresh token and reject concurrent reuse", async () => {
        const { cookies: initialCookies } = await getFreshLoginCookies();

        // Fire 2 concurrent refresh requests simultaneously with the exact same initial refresh token
        const [res1, res2] = await Promise.all([
            request(app).post("/api/auth/refresh-token").set("Cookie", initialCookies),
            request(app).post("/api/auth/refresh-token").set("Cookie", initialCookies)
        ]);

        const statuses = [res1.statusCode, res2.statusCode].sort();
        // Exactly one request must succeed with 200, and the other must be rejected with 401
        expect(statuses).toEqual([200, 401]);
    });
});
