import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // globalSetup: starts/stops the in-memory MongoDB (separate process)
        globalSetup: "./test/setup.js",

        // setupFiles: runs in the worker process to connect Mongoose
        setupFiles: ["./test/setup.worker.js"],

        // Set NODE_ENV so config.js skips Google email checks
        env: {
            NODE_ENV: "test"
        },

        // Longer timeout for DB-heavy integration tests
        testTimeout: 15000,

        // Run test files sequentially to avoid DB conflicts
        fileParallelism: false
    }
});
