import { AppError } from "./errors/AppError.js";
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


const app = express();

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

// ─── Global Error Handler ────────────────────────────────────────────────────
// Express identifies an error-handling middleware by its four-argument
// signature (err, req, res, next). All async errors in Express 5 are
// automatically forwarded here, so every unhandled rejection results in a
// structured JSON 500 response instead of crashing the process or leaking
// an HTML stack trace to the client.
app.use((err, _req, res, _next) => {
    // Log the full error server-side for debugging.
    console.error("[ERROR]", err);

    // Never send the raw stack trace to the client in production.
    const statusCode = err.status ?? err.statusCode ?? 500;
    res.status(statusCode).json({
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred. Please try again later."
    });
});

export default app;
