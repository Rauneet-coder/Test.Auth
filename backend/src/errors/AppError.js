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
}
