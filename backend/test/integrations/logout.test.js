import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app.js";
import Usermodel from "../../src/models/user.model.js";
import sessionModel from "../../src/models/session.model.js";

describe("POST /api/auth/logout and /api/auth/logout-all", () => {
    const testUser = {
        username: "logouttestuser",
        email: "logout.test@example.com",
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

    // Helper to log in and get fresh cookies for self-contained tests
    async function loginUser(userAgent = "supertest-agent") {
        const loginRes = await request(app)
            .post("/api/auth/login")
            .set("User-Agent", userAgent)
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
    it("should return 401 if refreshToken cookie is missing on logout", async () => {
        const response = await request(app).post("/api/auth/logout");

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Already logout!" });
    });

    // ─── Positive Test: Successful Logout ────────────────────────────────────
    it("should return 200, clear the cookie, and mark session revoked in DB", async () => {
        const { cookies } = await loginUser("logout-client-1");

        const response = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", cookies);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ message: "User logged out successfully" });

        // Verify the server commanded browser to clear cookie
        const clearCookieHeader = response.headers["set-cookie"]?.[0] || "";
        expect(clearCookieHeader).toContain("refreshToken=");

        // Verify database state: latest session should now be revoked
        const sessions = await sessionModel.find({ user: userDoc._id }).sort({ createdAt: -1 });
        expect(sessions[0].revoked).toBe(true);
    });

    // ─── Negative Test 2: Reusing Revoked Token (Self-contained) ─────────────
    it("should return 401 if trying to logout again with an already revoked token", async () => {
        const { cookies } = await loginUser("logout-client-2");

        // 1. First logout revokes the session
        const firstLogout = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", cookies);
        expect(firstLogout.statusCode).toBe(200);

        // 2. Second logout attempt with same revoked cookie must be rejected
        const secondLogout = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", cookies);

        expect(secondLogout.statusCode).toBe(401);
        expect(secondLogout.body).toEqual({ message: "Invalid or expired refresh token" });
    });

    // ─── Tests for POST /api/auth/logout-all ─────────────────────────────────
    it("should return 400 on logout-all if refreshToken cookie is missing", async () => {
        const response = await request(app).post("/api/auth/logout-all");

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ message: "Refresh token not found" });
    });

    it("should return 401 on logout-all if refreshToken is already revoked or invalid", async () => {
        const { cookies } = await loginUser("logout-client-3");

        // First revoke this session via single logout
        await request(app).post("/api/auth/logout").set("Cookie", cookies);

        // Attempting logout-all with a revoked token should be rejected with 401
        const response = await request(app)
            .post("/api/auth/logout-all")
            .set("Cookie", cookies);

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Invalid or expired refresh token" });
    });

    it("should revoke all active user sessions in database on logout-all", async () => {
        // 1. Establish 3 distinct active sessions from different devices/agents
        const session1 = await loginUser("Mozilla/5.0 - Laptop");
        const session2 = await loginUser("Mobile Safari - iPhone");
        const session3 = await loginUser("Chrome - Desktop");

        // Verify all 3 sessions are active in the database
        const activeBefore = await sessionModel.find({ user: userDoc._id, revoked: false });
        expect(activeBefore.length).toBeGreaterThanOrEqual(3);

        // 2. Call logout-all using one of the active session cookies
        const response = await request(app)
            .post("/api/auth/logout-all")
            .set("Cookie", session3.cookies);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ message: "Logged out from all devices successfully" });

        // 3. Confirm cookie clearing header
        const clearCookie = response.headers["set-cookie"]?.[0] || "";
        expect(clearCookie).toContain("refreshToken=");

        // 4. Assert in database: NO active (unrevoked) sessions remain for this user
        const activeAfter = await sessionModel.find({ user: userDoc._id, revoked: false });
        expect(activeAfter.length).toBe(0);

        // 5. Confirm that all sessions for this user are now marked revoked: true
        const allUserSessions = await sessionModel.find({ user: userDoc._id });
        expect(allUserSessions.length).toBeGreaterThanOrEqual(3);
        allUserSessions.forEach((session) => {
            expect(session.revoked).toBe(true);
        });

        // 6. Verify that previously valid sessions can no longer refresh or logout
        const refreshAttempt = await request(app)
            .post("/api/auth/refresh-token")
            .set("Cookie", session1.cookies);
        expect(refreshAttempt.statusCode).toBe(401);

        const logoutAttempt = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", session2.cookies);
        expect(logoutAttempt.statusCode).toBe(401);
    });
});
