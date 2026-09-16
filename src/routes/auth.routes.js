import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { RegisterSchema, LoginSchema, VerifyOtpSchema } from "../Validators/auth.validator.js";



const authRouter = Router();

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 */
authRouter.post("/register", validate(RegisterSchema), authController.registerUser);

/**
 * GET /api/auth/get-me
 * Response: { message, user: { username, email } }
 */
authRouter.get("/get-me", authController.getMe)

authRouter.post("/login", validate(LoginSchema), authController.login)

/**
 * POST /api/auth/refresh-token
 * Response: { message, accessToken }
 */
authRouter.post("/refresh-token", authController.refreshToken)


authRouter.post("/logout", authController.logout)

authRouter.post("/logout-all", authController.logoutAll)

authRouter.post("/verify-email", validate(VerifyOtpSchema), authController.verifyEmail)


export default authRouter;