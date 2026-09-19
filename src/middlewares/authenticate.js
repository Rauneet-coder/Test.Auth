// authenticate.js
// Reusable middleware that verifies the Bearer access token in the
// Authorization header, fetches the matching user (without the password
// hash), and attaches it to req.user so every downstream handler can
// trust that req.user is always a valid, authenticated user document.
//
// Usage in a route file:
//   import { authenticate } from "../middlewares/authenticate.js";
//   router.get("/me", authenticate, authController.getMe);

import jwt from "jsonwebtoken";
import config from "../config/config.js";
import Usermodel from "../models/user.model.js";

export const authenticate = async (req, res, next) => {
    // Extract the token from the "Authorization: Bearer <token>" header.
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: no token provided" });
    }

    try {
        // jwt.verify throws JsonWebTokenError / TokenExpiredError on failure,
        // so we always land in the catch block for any invalid token.
        const decoded = jwt.verify(token, config.JWT_SECRET);

        // Fetch user and deliberately exclude the password hash from memory.
        // This means even if req.user is accidentally serialised it cannot
        // leak the hash.
        const user = await Usermodel.findById(decoded.id).select("-password");

        if (!user) {
            // Token was valid but the account no longer exists.
            return res.status(401).json({ message: "Unauthorized: user not found" });
        }

        // Attach the full user document (minus password) for downstream handlers.
        req.user = user;
        next();
    } catch (_error) {
        // Catches JsonWebTokenError, TokenExpiredError, NotBeforeError, etc.
        return res.status(401).json({ message: "Unauthorized: invalid or expired token" });
    }
};
