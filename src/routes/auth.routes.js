import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";



const authRouter = Router();

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 */
authRouter.post("/register", authController.registerUser);

/**
 * GET /api/auth/get-me
 * Response: { message, user: { username, email } }
 */
authRouter.get("/get-me", authController.getMe)

authRouter.post("/login", authController.login)

/**
 * POST /api/auth/refresh-token
 * Response: { message, accessToken }
 */
authRouter.post("/refresh-token", authController.refreshToken)


authRouter.post("/logout", authController.logout)

authRouter.post("/logout-all", authController.logoutAll)

authRouter.post("/verify-email", authController.verifyEmail)


export default authRouter;