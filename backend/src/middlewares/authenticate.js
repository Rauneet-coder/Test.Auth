import { AppError } from "../errors/AppError.js";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import Usermodel from "../models/user.model.js";

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
        return next(new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication token is required"));
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);

        // Require exact access claim
        if (decoded.tokenUse !== "access") {
            return res.status(401).json({ message: "Unauthorized: invalid token type" });
        }
        
        const user = await Usermodel.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({ message: "Unauthorized: user not found" });
        }
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ message: "Unauthorized: invalid or expired token" });
    }
};
