import crypto from "crypto";

export const requestId = (req, res, next) => {
    const incomingId = req.headers["x-request-id"];
    const id = (typeof incomingId === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(incomingId.trim()))
        ? incomingId.trim()
        : crypto.randomUUID();

    req.id = id;
    next();
};
