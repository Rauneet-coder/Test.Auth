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

/**
 * POST /api/auth/refresh-token
 * Response: { message, accessToken }
 */
authRouter.get("/refresh-token", authController.refreshToken)


authRouter.get("/logout", authController.logout)

authRouter.get("/logout-all", authController.logoutAll)


export default authRouter;