import crypto from "crypto";

export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
};
