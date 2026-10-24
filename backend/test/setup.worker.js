// ─── Per-Worker Setup File ──────────────────────────────────────────────────
// This runs in the SAME process as the test files.
// It reads the in-memory MongoDB URI written by globalSetup,
// overrides process.env.MONGO_URL BEFORE config.js is imported,
// and connects Mongoose to the in-memory DB.

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const URI_FILE = join(__dirname, ".mongo-test-uri");

// ── Override env vars BEFORE anything imports config.js ──
const mongoUri = readFileSync(URI_FILE, "utf-8").trim();
process.env.MONGO_URL = mongoUri;
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-vitest";

beforeAll(async () => {
    // Connect Mongoose if not already connected
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
    }
});

afterAll(async () => {
    // Drop the entire test database for a clean slate, then disconnect
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
});
