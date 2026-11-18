import rateLimit from "express-rate-limit";
import { AppError } from "../errors/AppError.js";

/**
 * Factory to create rate limiters with custom options.
 */
export const createRateLimiter = (options = {}) => {
    return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes by default
        limit: 100, // max 100 requests per window by default
        standardHeaders: true, // draft-6 `RateLimit-*` headers
        legacyHeaders: false, // disable `X-RateLimit-*` headers
        statusCode: 429,
        handler: (_req, _res, next, opts) => {
            const message = typeof opts.message === "string"
                ? opts.message
                : (opts.message?.message || "Too many requests from this IP, please try again later.");
            next(new AppError(429, "RATE_LIMIT_EXCEEDED", message));
        },
        ...options
    });
};

/**
 * Standard auth router rate limiter.
 * In test mode, default limit is set higher (1000) so it does not interfere
 * with other test suites, while specific rate-limiting tests can test customized limits.
 */
export const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "test" ? 1000 : 100,
    message: "Too many requests from this IP, please try again later."
});

/**
 * Dedicated rate limiter for OTP resend endpoints.
 */
export const resendOtpRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "test" ? 100 : 5,
    message: "Too many verification code requests, please try again later."
});
