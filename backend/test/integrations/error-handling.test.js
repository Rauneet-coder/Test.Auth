import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import config from "../../src/config/config.js";
import Usermodel from "../../src/models/user.model.js";

describe("Production-Grade Error Handling Architecture", () => {
    it("should return 404 ROUTE_NOT_FOUND with standardized shape for unknown routes", async () => {
        const response = await request(app).get("/api/unknown-endpoint-path");

        expect(response.statusCode).toBe(404);
        expect(response.headers["x-request-id"]).toBeDefined();
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "ROUTE_NOT_FOUND",
                message: "The requested resource does not exist",
                requestId: response.headers["x-request-id"]
            }
        });
    });

    it("should preserve client-provided X-Request-Id correlation header", async () => {
        const customRequestId = "test-correlation-id-987654";
        const response = await request(app)
            .get("/api/unknown-endpoint-path")
            .set("X-Request-Id", customRequestId);

        expect(response.statusCode).toBe(404);
        expect(response.headers["x-request-id"]).toBe(customRequestId);
        expect(response.body.error.requestId).toBe(customRequestId);
    });

    it("should return 400 INVALID_REQUEST_BODY when JSON body is malformed", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .set("Content-Type", "application/json")
            .send('{"email": "broken-json');

        expect(response.statusCode).toBe(400);
        expect(response.headers["x-request-id"]).toBeDefined();
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "INVALID_REQUEST_BODY",
                message: "Invalid JSON in request body",
                requestId: response.headers["x-request-id"]
            }
        });
    });

    it("should return 413 PAYLOAD_TOO_LARGE when request body exceeds configured limit (10kb)", async () => {
        // Create an oversized body exceeding 10kb
        const hugeString = "a".repeat(12 * 1024);
        const response = await request(app)
            .post("/api/auth/login")
            .set("Content-Type", "application/json")
            .send(JSON.stringify({ email: "test@example.com", padding: hugeString }));

        expect(response.statusCode).toBe(413);
        expect(response.headers["x-request-id"]).toBeDefined();
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "PAYLOAD_TOO_LARGE",
                message: "Request payload exceeds the configured limit",
                requestId: response.headers["x-request-id"]
            }
        });
    });

    it("should return 403 ORIGIN_NOT_ALLOWED when CORS origin is unauthorized", async () => {
        const response = await request(app)
            .get("/api/auth/me")
            .set("Origin", "https://unauthorized-malicious-domain.com");

        expect(response.statusCode).toBe(403);
        expect(response.headers["x-request-id"]).toBeDefined();
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "ORIGIN_NOT_ALLOWED",
                message: "CORS origin not allowed",
                requestId: response.headers["x-request-id"]
            }
        });
    });

    it("should return 400 VALIDATION_ERROR with field-level details array on schema failure", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                username: "ab", // too short (min 3)
                email: "not-an-email",
                password: "weak" // does not meet requirements
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.message).toBe("Request validation failed");
        expect(Array.isArray(response.body.error.details)).toBe(true);
        expect(response.body.error.details.length).toBeGreaterThanOrEqual(3);

        const fields = response.body.error.details.map((d) => d.field);
        expect(fields).toContain("username");
        expect(fields).toContain("email");
        expect(fields).toContain("password");
    });

    it("should return 401 AUTHENTICATION_REQUIRED when access token is missing", async () => {
        const response = await request(app).get("/api/auth/me");

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "AUTHENTICATION_REQUIRED",
                message: "Authentication token is required",
                requestId: response.headers["x-request-id"]
            }
        });
    });

    it("should return 401 INVALID_ACCESS_TOKEN when access token is forged or invalid", async () => {
        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", "Bearer invalid-tampered-token");

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "INVALID_ACCESS_TOKEN",
                message: "Invalid or expired access token",
                requestId: response.headers["x-request-id"]
            }
        });
    });

    it("should return 401 INVALID_ACCESS_TOKEN when a token with incorrect tokenUse is presented", async () => {
        const refreshToken = jwt.sign(
            { id: "64b7f8e8f8d9b1a2c3d4e5f6", tokenUse: "refresh" },
            config.JWT_SECRET,
            { expiresIn: "1h" }
        );

        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${refreshToken}`);

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({
            success: false,
            error: {
                code: "INVALID_ACCESS_TOKEN",
                message: "Invalid access token type",
                requestId: response.headers["x-request-id"]
            }
        });
    });

    it("should route database/infrastructure failures in auth middleware to 500 instead of 401", async () => {
        const validAccessToken = jwt.sign(
            { id: "64b7f8e8f8d9b1a2c3d4e5f6", tokenUse: "access" },
            config.JWT_SECRET,
            { expiresIn: "15m" }
        );

        // Mock Usermodel.findById to simulate database connection loss during authentication
        const findByIdSpy = vi.spyOn(Usermodel, "findById").mockImplementationOnce(() => {
            throw new Error("MongooseServerSelectionError: connection timed out");
        });

        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${validAccessToken}`);

        findByIdSpy.mockRestore();

        // Must NOT return 401 Unauthorized, but 500 Internal Server Error
        expect(response.statusCode).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
        expect(response.body.error.message).toBe("An unexpected error occurred. Please try again later.");
        // Internal database details and stack traces must never be exposed to the client
        expect(response.body.error).not.toHaveProperty("stack");
        expect(JSON.stringify(response.body)).not.toContain("MongooseServerSelectionError");
    });
});
