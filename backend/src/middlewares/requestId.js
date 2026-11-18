import crypto from "crypto";

/**
 * Middleware that ensures every request has a unique correlation ID.
 * Uses Node.js built-in crypto.randomUUID().
 * Attaches the ID to req.id and sets the X-Request-Id response header.
 */
export const requestId = (req, res, next) => {
    const incomingId = req.headers["x-request-id"];
    // Accept client-provided request ID if it is a non-empty, safe string up to 128 chars
    const id = (typeof incomingId === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(incomingId.trim()))
        ? incomingId.trim()
        : crypto.randomUUID();

    req.id = id;
    res.setHeader("X-Request-Id", id);
    next();
};
