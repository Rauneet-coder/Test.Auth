import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app.js";
import Usermodel from "../../src/models/user.model.js";

describe("POST /api/auth/login", () => {
    const verifiedUser = {
        username: "loginverified",
        email: "login.verified@example.com",
        password: "ValidPassword123!"
    };

    const unverifiedUser = {
        username: "loginunverified",
        email: "login.unverified@example.com",
        password: "ValidPassword123!"
    };

    beforeAll(async () => {
        await Usermodel.deleteMany({
            email: { $in: [verifiedUser.email, unverifiedUser.email] }
        });

        const hashedVerifiedPassword = await bcrypt.hash(verifiedUser.password, 10);
        await Usermodel.create({
            username: verifiedUser.username,
            email: verifiedUser.email,
            password: hashedVerifiedPassword,
            verified: true
        });

        const hashedUnverifiedPassword = await bcrypt.hash(unverifiedUser.password, 10);
        await Usermodel.create({
            username: unverifiedUser.username,
            email: unverifiedUser.email,
            password: hashedUnverifiedPassword,
            verified: false
        });
    });

    afterAll(async () => {
        await Usermodel.deleteMany({
            email: { $in: [verifiedUser.email, unverifiedUser.email] }
        });
    });

    // ─── P0: Login with wrong password ───────────────────────────────────────
    it("should reject login if password is incorrect", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: verifiedUser.email,
                password: "WrongPassword999!"
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ message: "Invalid password" });
    });

    // ─── P0: Login before email verification ─────────────────────────────────
    it("should reject login before email verification", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: unverifiedUser.email,
                password: unverifiedUser.password
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ message: "Email not verified" });
    });

    // ─── P0: Login with verified user ────────────────────────────────────────
    it("should return access token and set refresh cookie for verified user", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .set("User-Agent", "supertest-agent")
            .send({
                email: verifiedUser.email,
                password: verifiedUser.password
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("message", "User logged in successfully");
        expect(response.body).toHaveProperty("accessToken");
        expect(typeof response.body.accessToken).toBe("string");
        expect(response.body.user.email).toBe(verifiedUser.email);
        expect(response.body.user.username).toBe(verifiedUser.username);

        const setCookie = response.headers["set-cookie"];
        expect(setCookie).toBeDefined();
        const refreshCookie = setCookie.find((c) => c.startsWith("refreshToken="));
        expect(refreshCookie).toBeDefined();
        expect(refreshCookie).toContain("HttpOnly");
    });

    // ─── Negative: Validation & Non-existent User ─────────────────────────────
    it("should return 400 validation error if email or password are missing", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({});

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty("errors");
    });

    it("should return 400 validation error if email format is invalid", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "invalid-email-format",
                password: "SomePassword123!"
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty("errors");
    });

    it("should reject login if user does not exist", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "nonexistent.user@example.com",
                password: "SomePassword123!"
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ message: "User not found" });
    });


});
