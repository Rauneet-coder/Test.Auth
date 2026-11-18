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
}
