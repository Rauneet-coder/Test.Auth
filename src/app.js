// This is the main entry point of the application where we are importing the express 
// framework and morgan middleware for logging HTTP requests. We are also setting up the 
// express application to use morgan for logging and express.json() middleware to parse incoming JSON requests.
import express from "express";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";


const app = express();

app.use(morgan("dev"));
app.use(express.json());
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
// Without this, Express returns a plain-text / HTML "Cannot GET /..." page
// which breaks the JSON API contract and can leak information.
app.use((_req, res) => {
    res.status(404).json({
        error: "NOT_FOUND",
        message: "The requested resource does not exist"
    });
});

export default app;
