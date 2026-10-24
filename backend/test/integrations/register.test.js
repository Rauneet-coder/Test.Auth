import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app.js";
import Usermodel from "../../src/models/user.model.js";

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
        expect(response.body.user.verified).toBe(false);
    });

    it("should return 409 if user already exists", async () => {
        // Attempting to register the exact same user again
        const response = await request(app).post("/api/auth/register").send({
            username: "uniqueuser123",
            email: "unique.testuser@example.com",
            password: "SecurePassword123!"
        });
        
        expect(response.statusCode).toBe(409);
        expect(response.body).toHaveProperty("message");
    });
});
