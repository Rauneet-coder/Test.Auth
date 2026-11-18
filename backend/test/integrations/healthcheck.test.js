import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("GET /api/auth/health-check - Validation", () => {
    it("should return 200 if the server is running", async () => {
        const response = await request(app).get("/api/auth/health-check");
        expect(response.statusCode).toBe(200);
    });

    it("should include security headers set by helmet", async () => {
        const response = await request(app).get("/api/auth/health-check");
        expect(response.headers["x-content-type-options"]).toBe("nosniff");
        expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    });

    it("should allow CORS requests from allowed origins", async () => {
        const response = await request(app)
            .get("/api/auth/health-check")
            .set("Origin", "http://localhost:5173");
        expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
        expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });
});