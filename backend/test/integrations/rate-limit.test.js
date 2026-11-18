import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { createRateLimiter } from "../../src/middlewares/rateLimiter.js";
import { requestId } from "../../src/middlewares/requestId.js";
import { errorHandler } from "../../src/middlewares/errorHandler.js";

describe("Rate Limiting Middleware", () => {
    it("should allow requests under the limit and reject excess requests with 429", async () => {
        // Create an isolated Express app with a strict limit of 3 requests
        const testApp = express();
        testApp.use(requestId);
        const testLimiter = createRateLimiter({
            windowMs: 60 * 1000, // 1 minute
            limit: 3,
            message: "Too many requests from this IP, please try again later."
        });

        testApp.use("/api/test-rate-limit", testLimiter, (_req, res) => {
            res.status(200).json({ status: "success" });
        });
        testApp.use(errorHandler);

        // 1st request — allowed (200)
        const res1 = await request(testApp).get("/api/test-rate-limit");
        expect(res1.statusCode).toBe(200);

        // 2nd request — allowed (200)
        const res2 = await request(testApp).get("/api/test-rate-limit");
        expect(res2.statusCode).toBe(200);

        // 3rd request — allowed (200, reached limit)
        const res3 = await request(testApp).get("/api/test-rate-limit");
        expect(res3.statusCode).toBe(200);

        // 4th request — EXCEEDS limit, must be rejected with 429
        const res4 = await request(testApp).get("/api/test-rate-limit");
        expect(res4.statusCode).toBe(429);
        expect(res4.body).toEqual({
            success: false,
            error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: "Too many requests from this IP, please try again later.",
                requestId: expect.any(String)
            }
        });

        // 5th request — still blocked with 429
        const res5 = await request(testApp).get("/api/test-rate-limit");
        expect(res5.statusCode).toBe(429);
    });
});
