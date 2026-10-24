import rateLimit from "express-rate-limit";

const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    limit: 100,
};
