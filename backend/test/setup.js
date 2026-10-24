// ─── Global Test Setup (globalSetup) ────────────────────────────────────────
// Starts a single in-memory MongoDB for the entire test run and writes
// its URI to an env var file that the per-worker setupFile reads.

import { MongoMemoryServer } from "mongodb-memory-server";
import { writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const URI_FILE = join(__dirname, ".mongo-test-uri");

let mongoServer;

export async function setup() {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Write URI to a temp file so setupFiles (in the worker process) can read it
    writeFileSync(URI_FILE, uri, "utf-8");
    console.log(`\n✔ In-memory MongoDB started at ${uri}`);
}

export async function teardown() {
    if (mongoServer) {
        await mongoServer.stop();
    }
    // Clean up the temp URI file
    try { unlinkSync(URI_FILE); } catch { /* ignore */ }
    console.log("✔ In-memory MongoDB stopped");
}
