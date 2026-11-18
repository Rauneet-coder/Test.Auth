import rateLimit from "express-rate-limit";

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
        message: {
            error: "TOO_MANY_REQUESTS",
            message: "Too many requests from this IP, please try again later."
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
});

/**
 * Dedicated rate limiter for OTP resend endpoints.
 */
export const resendOtpRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "test" ? 100 : 5,
    message: {
        error: "TOO_MANY_REQUESTS",
        message: "Too many verification code requests, please try again later."
    }
});
