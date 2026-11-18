export class AppError extends Error {
    constructor(statusCode, code, message, details = undefined, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        if (details !== undefined && details !== null) {
            this.details = details;
        }
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
    static validationError(details, message = "Request validation failed") {
        return new AppError(400, "VALIDATION_ERROR", message, details);
    }
    static authenticationRequired(message = "Authentication token is required") {
        return new AppError(401, "AUTHENTICATION_REQUIRED", message);
    }
    static invalidAccessToken(message = "Invalid or expired access token") {
        return new AppError(401, "INVALID_ACCESS_TOKEN", message);
    }
    static invalidCredentials(message = "Invalid email or password") {
        return new AppError(400, "INVALID_CREDENTIALS", message);
    }
    static emailNotVerified(message = "Email not verified") {
        return new AppError(400, "EMAIL_NOT_VERIFIED", message);
    }
    static resourceConflict(message = "Resource already exists") {
        return new AppError(409, "RESOURCE_CONFLICT", message);
    }
    static resourceNotFound(message = "The requested resource was not found") {
        return new AppError(404, "RESOURCE_NOT_FOUND", message);
    }
    static invalidRefreshToken(message = "Invalid or expired refresh token") {
        return new AppError(401, "INVALID_REFRESH_TOKEN", message);
    }
    static rateLimitExceeded(message = "Too many requests, please try again later") {
        return new AppError(429, "RATE_LIMIT_EXCEEDED", message);
    }
    static invalidRequestBody(message = "Invalid JSON in request body") {
        return new AppError(400, "INVALID_REQUEST_BODY", message);
    }
    static payloadTooLarge(message = "Request payload exceeds the configured limit") {
        return new AppError(413, "PAYLOAD_TOO_LARGE", message);
    }
    static originNotAllowed(message = "CORS origin not allowed") {
        return new AppError(403, "ORIGIN_NOT_ALLOWED", message);
    }
}
