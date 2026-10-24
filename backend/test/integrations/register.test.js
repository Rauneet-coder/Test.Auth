import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app.js";
import Usermodel from "../../src/models/user.model.js";

describe("POST /api/auth/register", () => {
    beforeAll(async () => {
        // Clean up test user so test is repeatable
        await Usermodel.deleteOne({ email: "unique.testuser@example.com" });
    });

    afterAll(async () => {
        await Usermodel.deleteOne({ email: "unique.testuser@example.com" });
    });

    it("should return 201 if user is registered successfully", async () => {
        const response = await request(app).post("/api/auth/register").send({
            username: "uniqueuser123",
            email: "unique.testuser@example.com",
            password: "SecurePassword123!" // Passes uppercase, number, & special char rules
        });
        
        expect(response.statusCode).toBe(201);
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
