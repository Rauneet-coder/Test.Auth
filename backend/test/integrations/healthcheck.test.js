import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("GET /api/auth/health-check - Validation", () => {
    it("should return 200 if the server is running", async () => {
        const response = await request(app).get("/api/auth/health-check");
        expect(response.statusCode).toBe(200);
    });
});