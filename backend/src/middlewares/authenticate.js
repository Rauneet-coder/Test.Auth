import jwt from "jsonwebtoken";
import config from "../config/config.js";
import Usermodel from "../models/user.model.js";

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: no token provided" });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);

        if (decoded.tokenUse && decoded.tokenUse !== "access") {
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
