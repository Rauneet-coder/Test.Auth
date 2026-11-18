import { AppError } from "../errors/AppError.js";

export const validate = (schema) => (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const details = result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));

        return next(AppError.validationError(details, "Request validation failed"));
    }

    req.body = result.data;
    next();
};
