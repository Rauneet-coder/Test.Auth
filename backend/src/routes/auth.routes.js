import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/authenticate.js";
import { RegisterSchema, LoginSchema, VerifyOtpSchema } from "../Validators/auth.validator.js";
import { authRateLimiter } from "../middlewares/rateLimiter.js";


const authRouter = Router();

authRouter.use(authRateLimiter);

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 */
authRouter.post("/register", validate(RegisterSchema), authController.registerUser);

/**
 * GET /api/auth/me
 * Protected — requires "Authorization: Bearer <accessToken>" header.
 * authenticate middleware validates the token and populates req.user
 * before the controller runs.
 * Response: { message, user: { username, email } }
 */
authRouter.get("/me", authenticate, authController.getMe);

authRouter.post("/login", validate(LoginSchema), authController.login);

/**
 * POST /api/auth/refresh-token
 * Response: { message, accessToken }
 */
authRouter.post("/refresh-token", authController.refreshToken);

authRouter.post("/logout", authController.logout);

authRouter.post("/logout-all", authController.logoutAll);

authRouter.post("/verify-email", validate(VerifyOtpSchema), authController.verifyEmail);

authRouter.get("/health-check", authController.healthcheck);
export default authRouter;