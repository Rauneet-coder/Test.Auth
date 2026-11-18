import jwt from "jsonwebtoken";
import config from "../config/config.js";
import Usermodel from "../models/user.model.js";
import { AppError } from "../errors/AppError.js";

export const authenticate = async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
        return next(new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication token is required"));
    }

    let decoded;
    try {
        decoded = jwt.verify(token, config.JWT_SECRET);
    } catch {
        return next(new AppError(401, "INVALID_ACCESS_TOKEN", "Invalid or expired access token"));
    }

    // Require exact access claim
    if (decoded.tokenUse !== "access") {
        return next(new AppError(401, "INVALID_ACCESS_TOKEN", "Invalid access token type"));
    }

    // Internal infrastructure / database failures here will naturally bubble up to
    // Express 5 error handling as 500 errors, rather than being disguised as 401s.
    const user = await Usermodel.findById(decoded.id).select("-password");

    if (!user) {
        return next(new AppError(401, "AUTHENTICATION_REQUIRED", "User no longer exists"));
    }

    req.user = user;
    next();
};
