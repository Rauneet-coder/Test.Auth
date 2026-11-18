import crypto from "crypto";
import { AppError } from "../errors/AppError.js";

/**
 * Centralized Global Error Handler Middleware for Express.
 * Normalizes all operational and unexpected application errors
 * into the standardized API error contract:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "Safe human message",
 *     "details": [ ... ], // optional
 *     "requestId": "uuid"
 *   }
 * }
 */
export const errorHandler = (err, req, res, next) => {
    // If response headers have already been sent, delegate to default Express handler
    if (res.headersSent) {
        return next(err);
    }

    const requestId = req.id || req.headers?.["x-request-id"] || crypto.randomUUID();

    // Ensure the response header is always set even if error occurred before/during requestId middleware
    if (!res.getHeader("X-Request-Id")) {
        res.setHeader("X-Request-Id", requestId);
    }

    let statusCode = 500;
    let code = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred. Please try again later.";
    let details = undefined;
    let isOperational = false;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        details = err.details;
        isOperational = err.isOperational;
    } else if (err.name === "ZodError" && Array.isArray(err.issues)) {
        statusCode = 400;
        code = "VALIDATION_ERROR";
        message = "Request validation failed";
        details = err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
        isOperational = true;
    } else if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        statusCode = 400;
        code = "INVALID_REQUEST_BODY";
        message = "Invalid JSON in request body";
        isOperational = true;
    } else if (err.type === "entity.too.large" || err.status === 413) {
        statusCode = 413;
        code = "PAYLOAD_TOO_LARGE";
        message = "Request payload exceeds the configured limit";
        isOperational = true;
    } else if (err.message === "Not allowed by CORS" || err.code === "ORIGIN_NOT_ALLOWED") {
        statusCode = 403;
        code = "ORIGIN_NOT_ALLOWED";
        message = "CORS origin not allowed";
        isOperational = true;
    } else if (err.code === 11000 || (err.name === "MongoServerError" && err.code === 11000)) {
        statusCode = 409;
        code = "RESOURCE_CONFLICT";
        message = "Resource already exists";
        isOperational = true;
    } else if (err.name === "CastError") {
        statusCode = 400;
        code = "VALIDATION_ERROR";
        message = `Invalid value for parameter: ${err.path}`;
        isOperational = true;
    } else if (err.name === "ValidationError" && err.errors) {
        statusCode = 400;
        code = "VALIDATION_ERROR";
        message = "Request validation failed";
        details = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));
        isOperational = true;
    } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        statusCode = 401;
        code = "INVALID_ACCESS_TOKEN";
        message = "Invalid or expired access token";
        isOperational = true;
    } else {
        // Explicit status property on unexpected errors if set
        if (typeof err.status === "number" && err.status >= 400 && err.status < 500) {
            statusCode = err.status;
            code = "CLIENT_ERROR";
            message = err.message || "Bad request";
            isOperational = true;
        } else if (typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 500) {
            statusCode = err.statusCode;
            code = "CLIENT_ERROR";
            message = err.message || "Bad request";
            isOperational = true;
        }
    }

    // Server-side logging: Log operational warnings vs unexpected server errors
    if (!isOperational || statusCode >= 500) {
        console.error(`[ERROR] [${requestId}] Unexpected Server Error:`, err);
    } else if (process.env.NODE_ENV !== "test") {
        console.warn(`[WARN] [${requestId}] Operational Error (${statusCode} ${code}): ${message}`);
    }

    const errorResponse = {
        code,
        message,
        ...(details !== undefined && details !== null ? { details } : {}),
        requestId,
    };

    return res.status(statusCode).json({
        success: false,
        error: errorResponse,
    });
};
