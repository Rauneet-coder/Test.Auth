import crypto from "crypto";

export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const requestId = req.id || req.headers?.["x-request-id"] || crypto.randomUUID();
    if (!res.getHeader("X-Request-Id")) {
        res.setHeader("X-Request-Id", requestId);
    }
    res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred. Please try again later.",
            requestId
        }
    });
};
