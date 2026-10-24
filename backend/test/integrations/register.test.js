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
        expect(response.body.user.username).toBe(validUser.username);
        expect(response.body.user.email).toBe(validUser.email);
        expect(response.body.user.verified).toBe(false);
    });

    // ─── P0: Register duplicate email/username ────────────────────────────────
    it("should return 409 if email already exists", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                username: "differentusername",
                email: validUser.email,
                password: "SecurePassword123!"
            });

        expect(response.statusCode).toBe(409);
        expect(response.body).toHaveProperty("message", "User already exists");
    });

    it("should return 409 if username already exists", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                username: validUser.username,
                email: "another.user@example.com",
                password: "SecurePassword123!"
            });

        expect(response.statusCode).toBe(409);
        expect(response.body).toHaveProperty("message", "User already exists");
    });

    // ─── P0: Invalid registration data (Validation errors) ───────────────────
    describe("Validation Errors", () => {
        it("should return 400 validation error if required fields are missing", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({});

            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(Array.isArray(response.body.errors)).toBe(true);
            expect(response.body.errors.length).toBeGreaterThan(0);
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
            expect(response.body).toHaveProperty("errors");
            const emailError = response.body.errors.find((e) => e.field === "email");
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
            expect(response.body).toHaveProperty("errors");
            const usernameError = response.body.errors.find((e) => e.field === "username");
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
            expect(response.body).toHaveProperty("errors");
            const passwordError = response.body.errors.find((e) => e.field === "password");
            expect(passwordError).toBeDefined();
        });
    });

    // ─── P2: Password hashing ────────────────────────────────────────────────
    it("should securely hash password with bcrypt and never store plaintext in database", async () => {
        const savedUser = await Usermodel.findOne({ email: validUser.email });
        expect(savedUser).toBeDefined();

        // 1. Password must NEVER equal the plaintext password
        expect(savedUser.password).not.toBe(validUser.password);

        // 2. Password must match standard bcrypt hash format ($2a$ or $2b$)
        expect(savedUser.password).toMatch(/^\$2[ab]\$\d{2}\$/);
    });
});
