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

    it("should return 400 if email or password are missing", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({});
        expect(response.statusCode).toBe(400);
    });
});
