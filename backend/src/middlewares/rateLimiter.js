import rateLimit from "express-rate-limit";

/**
 * Factory to create rate limiters with custom options.
 */
export const createRateLimiter = (options = {}) => {
    return rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 100,
        standardHeaders: true,
        legacyHeaders: false,
        statusCode: 429,
        message: {
            error: "TOO_MANY_REQUESTS",
            message: "Too many requests from this IP, please try again later."
        },
        ...options
    });
};
