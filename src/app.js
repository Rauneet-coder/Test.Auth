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
app.use(cookieParser())


app.use("/api/auth", authRouter);

export default app;
