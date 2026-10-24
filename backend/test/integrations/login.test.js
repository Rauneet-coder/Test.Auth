import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app.js";
import Usermodel from "../../src/models/user.model.js";

describe("POST /api/auth/login", () => {
    it("should return 400 if email or password are missing", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({});
        expect(response.statusCode).toBe(400);
    });
});
