import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";



const authRouter = Router();

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 */
authRouter.post("/register", authController.registerUser);


authRouter.get("/get-me", authController.getMe)

authRouter.get("/refresh-token", authController.refreshToken)


export default authRouter;