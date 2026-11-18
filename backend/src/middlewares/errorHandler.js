import crypto from "crypto";
import { AppError } from "../errors/AppError.js";

export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const requestId = req.id || req.headers?.["x-request-id"] || crypto.randomUUID();
    if (!res.getHeader("X-Request-Id")) {
        res.setHeader("X-Request-Id", requestId);
    }

    let statusCode = 500;
    let code = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred. Please try again later.";
    let details = undefined;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        details = err.details;
    } else if (err.name === "ZodError" && Array.isArray(err.issues)) {
        statusCode = 400;
        code = "VALIDATION_ERROR";
        message = "Request validation failed";
        details = err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
    } else if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        statusCode = 400;
        code = "INVALID_REQUEST_BODY";
        message = "Invalid JSON in request body";
    } else if (err.type === "entity.too.large" || err.status === 413) {
        statusCode = 413;
        code = "PAYLOAD_TOO_LARGE";
        message = "Request payload exceeds the configured limit";
    } else if (err.message === "Not allowed by CORS" || err.code === "ORIGIN_NOT_ALLOWED") {
        statusCode = 403;
        code = "ORIGIN_NOT_ALLOWED";
        message = "CORS origin not allowed";
    } else if (err.code === 11000 || (err.name === "MongoServerError" && err.code === 11000)) {
        statusCode = 409;
        code = "RESOURCE_CONFLICT";
        message = "Resource already exists";
    } else if (err.name === "CastError") {
        statusCode = 400;
        code = "VALIDATION_ERROR";
        message = `Invalid value for parameter: ${err.path}`;
    } else if (err.name === "ValidationError" && err.errors) {
        statusCode = 400;
        code = "VALIDATION_ERROR";
        message = "Request validation failed";
        details = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        details = err.details;
    }

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(details !== undefined && details !== null ? { details } : {}),
            requestId
        }
    });
};
