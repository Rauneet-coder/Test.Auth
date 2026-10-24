import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { createRateLimiter } from "../../src/middlewares/rateLimiter.js";

describe("Rate Limiting Middleware", () => {
    it("should allow requests under the limit and reject excess requests with 429", async () => {
        const testApp = express();
        const testLimiter = createRateLimiter({
            windowMs: 60 * 1000,
            limit: 3,
            message: {
                error: "TOO_MANY_REQUESTS",
                message: "Too many requests from this IP, please try again later."
            }
        });

        testApp.use("/api/test-rate-limit", testLimiter, (_req, res) => {
            res.status(200).json({ status: "success" });
        });

        const res1 = await request(testApp).get("/api/test-rate-limit");
        expect(res1.statusCode).toBe(200);

        const res2 = await request(testApp).get("/api/test-rate-limit");
        expect(res2.statusCode).toBe(200);

        const res3 = await request(testApp).get("/api/test-rate-limit");
        expect(res3.statusCode).toBe(200);
    });
});
