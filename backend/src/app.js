// This is the main entry point of the application where we are importing the express 
// framework and morgan middleware for logging HTTP requests. We are also setting up the 
// express application to use morgan for logging and express.json() middleware to parse incoming JSON requests.
import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import authRouter from "./routes/auth.routes.js";
import { requestId } from "./middlewares/requestId.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "./errors/AppError.js";

const app = express();

// Assign / correlate request ID first for all downstream middleware, routes and logging
app.use(requestId);

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new AppError(403, "ORIGIN_NOT_ALLOWED", "CORS origin not allowed"));
    },
    credentials: true
}));

app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Health check endpoint for CI/CD pipeline
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.use("/api/auth", authRouter);

// ─── 404 Catch-All ──────────────────────────────────────────────────────────
// This middleware runs only when no route above matched the request.
app.use((_req, _res, next) => {
    next(new AppError(404, "ROUTE_NOT_FOUND", "The requested resource does not exist"));
});

// ─── Global Centralized Error Handler ────────────────────────────────────────
// Standardizes all errors into { success: false, error: { code, message, details, requestId } }
app.use(errorHandler);

export default app;
