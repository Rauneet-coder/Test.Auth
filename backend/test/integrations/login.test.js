import {describe, it, expect} from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("POST /api/auth/login - Validation", () => {
    it("should return 400 if email or password are missing", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({});
        expect(response.statusCode).toBe(400);
    });

 
    it("should return 401 if user does not exist", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "[EMAIL_ADDRESS]",
                password: "SomePassword123!"
            });
        expect(response.statusCode).toBe(400);
    });

    it("should return 401 if password is incorrect", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "[EMAIL_ADDRESS]",
                password: "wrongpassword"
            });
        expect(response.statusCode).toBe(400);
    });

    it("should return 401 if user is not verified", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "[EMAIL_ADDRESS]",
                password: "SomePassword123!"
            });
        expect(response.statusCode).toBe(400);
    });

    it("should return 401 if user is blocked", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "[EMAIL_ADDRESS]",
                password: "SomePassword123!"
            });
        expect(response.statusCode).toBe(400);
    });
});