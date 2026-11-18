// ─── Per-Worker Setup File ──────────────────────────────────────────────────
// This runs in the SAME process as the test files.
// It receives the in-memory MongoDB URI from globalSetup (via inject or file),
// overrides process.env.MONGO_URL BEFORE config.js is imported,
// and connects Mongoose to the in-memory DB.

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { beforeAll, afterAll, inject } from "vitest";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const URI_FILE = join(__dirname, ".mongo-test-uri");

function resolveMongoUri() {
    try {
        const injected = inject("mongoUri");
        if (injected) return injected;
    } catch { /* ignore */ }

    try {
        if (existsSync(URI_FILE)) {
            const fileUri = readFileSync(URI_FILE, "utf-8").trim();
            if (fileUri) return fileUri;
        }
    } catch { /* ignore */ }

    return process.env.MONGO_URL || "";
}

// ── Override env vars BEFORE anything imports config.js ──
const initialUri = resolveMongoUri();
if (initialUri) {
    process.env.MONGO_URL = initialUri;
}
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-vitest";

beforeAll(async () => {
    const mongoUri = resolveMongoUri();
    if (mongoUri) {
        process.env.MONGO_URL = mongoUri;
    }
    // Connect Mongoose if not already connected
    if (mongoose.connection.readyState === 0 && mongoUri) {
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
