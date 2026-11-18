# Phase 0: Stabilization & Remediation Plan

**Repository:** `Rauneet-coder/Test.Auth`  
**Date:** November 18, 2026  
**Document Status:** Ready for Review & Approval  

This document details the prioritized engineering tasks to stabilize `Test.Auth` before proceeding to any new feature development (Phase 1). Each task addresses a confirmed defect or security vulnerability identified in `docs/PHASE_0_AUDIT.md`.

---

## Task Index

- [TASK-01: Fix Docker Hub Publishing in CI/CD Workflows](#task-01-fix-docker-hub-publishing-in-cicd-workflows) (P0 - Pending)
- [TASK-02: Add Frontend Production Build to CI Pipeline](#task-02-add-frontend-production-build-to-ci-pipeline) (P0 - Pending)
- [TASK-03: Remediate Account Enumeration in Login Endpoint](#task-03-remediate-account-enumeration-in-login-endpoint) (P1 - ✅ Completed)
- [TASK-04: Configure Helmet & CORS Security Middleware](#task-04-configure-helmet--cors-security-middleware) (P1 - ✅ Completed)
- [TASK-05: Enable Dynamic Port & Await Database Connection at Boot](#task-05-enable-dynamic-port--await-database-connection-at-boot) (P1 - ✅ Completed)
- [TASK-06: Enforce Email Trimming & Case-Insensitive Normalization](#task-06-enforce-email-trimming--case-insensitive-normalization) (P1 - ✅ Completed)
- [TASK-07: Add Indexes & TTL Expiration for Sessions and OTPs](#task-07-add-indexes--ttl-expiration-for-sessions-and-otps) (P2 - ✅ Completed)
- [TASK-08: Implement Cooldown & Dedicated Rate Limiting for Resend OTP](#task-08-implement-cooldown--dedicated-rate-limiting-for-resend-otp) (P2 - ✅ Completed)
- [TASK-09: Enforce Password Max-Length Boundary in Validator](#task-09-enforce-password-max-length-boundary-in-validator) (P2 - ✅ Completed)
- [TASK-10: Align Node.js Runner Versions in Workflows & Vitest Script](#task-10-align-nodejs-runner-versions-in-workflows--vitest-script) (P2 - ✅ Completed)
- [TASK-11: Correct Outdated Documentation & Update Technical Specifications](#task-11-correct-outdated-documentation--update-technical-specifications) (P3 - ✅ Completed)
- [TASK-12: Address High-Priority Dependency Advisories & Fix Package Naming](#task-12-address-high-priority-dependency-advisories--fix-package-naming) (P3 - ✅ Completed)

---

### TASK-01: Fix Docker Hub Publishing in CI/CD Workflows
- **Priority:** P0 (Critical)
- **Problem:**
  Both `backend.yml` and `frontend.yml` fail at the Docker Hub publishing step across all recent runs with:
  `Error response from daemon: Get "https://registry-1.docker.io/v2/": unknown: malformed HTTP Authorization header`.
  The failure stems from fragile custom shell-based `docker login` steps and temporary config paths.
- **Evidence:**
  - `.github/workflows/backend.yml#L60-L75`: Custom `DOCKER_CONFIG` with `echo "$DOCKER_TOKEN" | docker login`
  - `.github/workflows/frontend.yml#L45-L65`: Complex `sed` and `printf` pipeline
  - GitHub Actions runs `43615488894` and `43610107437` failed with exit code 1.
- **Proposed Change:**
  1. Replace the custom shell scripts with the official `docker/login-action@v3`.
  2. Add guards ensuring credentials exist before attempting login/push.
  3. Ensure repository name is lowercased for Docker Hub tagging.
  4. Use standard `docker/setup-buildx-action@v3` and `docker/build-push-action@v6`.
- **Affected Files:**
  - `.github/workflows/backend.yml`
  - `.github/workflows/frontend.yml`
- **Validation Steps:**
  - Verify workflow YAML syntax with Action validator.
  - Review secret references against standard GitHub Actions action inputs.
- **Acceptance Criteria:**
  - Workflows use official `docker/login-action@v3`.
  - Non-main or PR events run lint and tests without attempting Docker publish.
  - Pushes to `main` authenticate cleanly with standard credentials and tag format.

---

### TASK-02: Add Frontend Production Build to CI Pipeline
- **Priority:** P0 (Critical)
- **Problem:**
  `frontend.yml` runs `npm test` and `npm run lint`, but never executes `npm run build`. A bundle or Vite configuration defect would pass CI unnoticed.
- **Evidence:**
  - `.github/workflows/frontend.yml#L20-L29` only contains:
    ```yaml
    - run: npm ci
    - run: npm test
    - run: npm run lint
    ```
- **Proposed Change:**
  Add `- run: npm run build` to the `check` job in `.github/workflows/frontend.yml`.
- **Affected Files:**
  - `.github/workflows/frontend.yml`
- **Validation Steps:**
  - Run `npm --prefix frontend run build` locally to verify build succeeds.
- **Acceptance Criteria:**
  - Frontend CI checks run lint, test, and production build in sequential verification.

---

### TASK-03: Remediate Account Enumeration in Login Endpoint
- **Priority:** P1 (High)
- **Problem:**
  `POST /api/auth/login` returns different error messages depending on whether an email exists:
  - If user is missing: `400 { message: "User not found" }`
  - If password is wrong: `400 { message: "Invalid password" }`
  This permits attackers to enumerate registered users.
- **Evidence:**
  - `backend/src/controllers/auth.controller.js#L96-L107`:
    ```javascript
    const user = await Usermodel.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: "User not found" });
    }
    // ...
    if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid password" });
    }
    ```
- **Proposed Change:**
  Standardize the response for both conditions to `400 { message: "Invalid email or password" }`.
  Maintain the specific check for `if (!user.verified)` which returns `400 { message: "Email not verified" }` as required for unverified account recovery flows.
- **Affected Files:**
  - `backend/src/controllers/auth.controller.js`
  - `backend/test/integrations/login.test.js`
- **Validation Steps:**
  - Update `backend/test/integrations/login.test.js` to assert "Invalid email or password".
  - Run `npm --prefix backend run test-run`.
- **Acceptance Criteria:**
  - Both incorrect password and nonexistent email return status 400 with message `"Invalid email or password"`.
  - Frontend tests continue to pass.

---

### TASK-04: Configure Helmet & CORS Security Middleware
- **Priority:** P1 (High)
- **Problem:**
  The Express application lacks `helmet` (no HSTS, CSP, X-Frame-Options, or X-Content-Type-Options headers) and lacks `cors` middleware (blocking browsers when the frontend is accessed from a separate host/port or production domain).
- **Evidence:**
  - `backend/src/app.js#L10-L15`: Only registers `morgan`, `express.json()`, and `cookieParser()`.
- **Proposed Change:**
  1. Add `helmet` and `cors` to `backend/package.json`.
  2. In `backend/src/app.js`, apply `helmet()` and `cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "http://localhost:5173", credentials: true })`.
- **Affected Files:**
  - `backend/package.json`
  - `backend/src/app.js`
- **Validation Steps:**
  - Test `/health` and `/api/auth/me` with curl/supertest to inspect presence of security headers (`x-content-type-options: nosniff`, etc.).
  - Run all backend integration tests to ensure no middleware regressions.
- **Acceptance Criteria:**
  - Standard security headers are returned on all HTTP responses.
  - Cross-origin requests with credentials from allowed frontend origins succeed.

---

### TASK-05: Enable Dynamic Port & Await Database Connection at Boot
- **Priority:** P1 (High)
- **Problem:**
  `backend/server.js` hardcodes port `3000`, ignoring `process.env.PORT` or `config.PORT`. Additionally, it calls `connectDB()` without `await`, causing the HTTP server to accept traffic before database connectivity is confirmed.
- **Evidence:**
  - `backend/server.js#L4-L7`:
    ```javascript
    connectDB();
    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
    ```
- **Proposed Change:**
  1. In `backend/src/config/config.js`, export `PORT: process.env.PORT || 3000`.
  2. In `backend/server.js`, await `connectDB()` before calling `app.listen(config.PORT, ...)`.
- **Affected Files:**
  - `backend/src/config/config.js`
  - `backend/server.js`
- **Validation Steps:**
  - Start server with `PORT=3001 node server.js` and verify it binds to port 3001.
- **Acceptance Criteria:**
  - Server listens on `process.env.PORT` when supplied, falling back to 3000.
  - Server only binds and prints listening message after successful MongoDB connection.

---

### TASK-06: Enforce Email Trimming & Case-Insensitive Normalization
- **Priority:** P1 (High)
- **Problem:**
  Email addresses are stored and queried without case normalization. `User@domain.com` and `user@domain.com` are treated as distinct strings, allowing duplicate accounts and bypasses.
- **Evidence:**
  - `backend/src/models/user.model.js#L9-L14`: No `lowercase: true` or `trim: true`.
  - `backend/src/Validators/auth.validator.js`: No `.toLowerCase().trim()`.
- **Proposed Change:**
  1. In `user.model.js`, add `lowercase: true, trim: true` to `email`, and `trim: true` to `username`.
  2. In `auth.validator.js`, normalize email input with `.trim().toLowerCase()`.
  3. Ensure `otp.model.js` also lowercases and trims `email`.
- **Affected Files:**
  - `backend/src/models/user.model.js`
  - `backend/src/models/otp.model.js`
  - `backend/src/Validators/auth.validator.js`
  - `backend/src/controllers/auth.controller.js`
- **Validation Steps:**
  - Add test in `test/integrations/register.test.js` attempting to register `USER@EXAMPLE.COM` when `user@example.com` exists, expecting 409.
  - Verify login succeeds with mixed-case email.
- **Acceptance Criteria:**
  - All email storage and lookups are strictly lowercased and trimmed.
  - Duplicate registration attempts with differing casing are rejected with 409.

---

### TASK-07: Add Indexes & TTL Expiration for Sessions and OTPs
- **Priority:** P2 (Medium)
- **Problem:**
  1. `sessionModel` stores sessions without a TTL index or expiration mechanism; revoked and abandoned sessions accumulate forever in MongoDB.
  2. Frequent lookups on `sessionModel.refreshTokenHash`, `sessionModel.user`, and `otpModel.email` cause unindexed collection scans.
  3. Mongoose schemas refer to `ref: "users"` while the model name is `"Users"`.
- **Evidence:**
  - `backend/src/models/session.model.js`: No indexes on `refreshTokenHash` or `user`; no `deletedAt` or `expires` option.
  - `backend/src/models/otp.model.js`: No indexes on `email` or `user`.
- **Proposed Change:**
  1. In `session.model.js`, add index `{ refreshTokenHash: 1 }` and `{ user: 1 }`.
  2. Add `expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), expires: 0 }` to `session.model.js` so MongoDB automatically purges sessions after 7 days.
  3. In `otp.model.js`, add index `{ email: 1 }` and `{ user: 1 }`.
  4. Fix model reference casing to `ref: "Users"` across `otp.model.js` and `session.model.js`.
- **Affected Files:**
  - `backend/src/models/session.model.js`
  - `backend/src/models/otp.model.js`
- **Validation Steps:**
  - Run backend tests to verify schema registration and query execution.
  - Inspect index creation in test worker.
- **Acceptance Criteria:**
  - Indexes exist on all high-frequency query paths.
  - Sessions automatically expire and are purged by MongoDB TTL.

---

### TASK-08: Implement Cooldown & Dedicated Rate Limiting for Resend OTP
- **Priority:** P2 (Medium)
- **Problem:**
  `POST /api/auth/resend-otp` has no cooldown period and no dedicated rate limit. An attacker can repeatedly call the endpoint to flood a victim's email or exhaust OAuth/SMTP quotas.
- **Evidence:**
  - `backend/src/controllers/auth.controller.js#L388-L422`: Directly deletes old OTP and creates a new one without checking when the last OTP was issued.
- **Proposed Change:**
  1. In `auth.controller.js`, before issuing a new OTP in `resendOtp`, check if an active OTP exists that was created within the last 60 seconds. If so, return `429 { message: "Please wait 60 seconds before requesting another verification code." }`.
  2. Create a dedicated `resendOtpRateLimiter` (e.g. 5 requests per 15 minutes per IP) and apply it to `/resend-otp` and `/resend-verification`.
- **Affected Files:**
  - `backend/src/controllers/auth.controller.js`
  - `backend/src/middlewares/rateLimiter.js`
  - `backend/src/routes/auth.routes.js`
  - `backend/test/integrations/resend-otp.test.js`
- **Validation Steps:**
  - Add test verifying that requesting an OTP resend within 60 seconds returns 429.
  - Verify that after cooldown, resend returns 200.
- **Acceptance Criteria:**
  - Rapid sequential resend requests are rejected with 429.
  - Legitimate resends after cooldown proceed normally.

---

### TASK-09: Enforce Password Max-Length Boundary in Validator
- **Priority:** P2 (Medium)
- **Problem:**
  `RegisterSchema` does not enforce a maximum length on `password`. Bcrypt silently truncates passwords after 72 bytes. Passwords longer than 72 bytes can also trigger excessive server-side hashing CPU latency.
- **Evidence:**
  - `backend/src/Validators/auth.validator.js#L9-L14`: Only specifies `.min(8)` and regex rules.
- **Proposed Change:**
  Add `.max(72, "Password must not exceed 72 characters")` to `RegisterSchema` in `auth.validator.js`.
- **Affected Files:**
  - `backend/src/Validators/auth.validator.js`
  - `backend/test/integrations/register.test.js`
- **Validation Steps:**
  - Add integration test in `register.test.js` passing a 73-character password, asserting 400 validation error.
- **Acceptance Criteria:**
  - Passwords exceeding 72 characters are rejected with a descriptive 400 error.

---

### TASK-10: Align Node.js Runner Versions in Workflows & Vitest Script
- **Priority:** P2 (Medium)
- **Problem:**
  `backend.yml` currently runs `lint` on Node 20 and `test` on Node 24. Furthermore, the test step runs `npm test` instead of `npm run test-run` (`vitest run`).
- **Evidence:**
  - `.github/workflows/backend.yml#L35, L50`
  - `backend/package.json#L12-L13`:
    ```json
    "test": "vitest",
    "test-run": "vitest run"
    ```
- **Proposed Change:**
  1. Standardize on Node.js 20 (or Node.js 24) across all jobs in `.github/workflows/backend.yml` and `.github/workflows/frontend.yml`.
  2. Change backend test step to `run: npm run test-run`.
- **Affected Files:**
  - `.github/workflows/backend.yml`
  - `.github/workflows/frontend.yml`
- **Validation Steps:**
  - Verify workflows pass linting.
- **Acceptance Criteria:**
  - Node.js versions are consistent across all workflow steps.
  - Tests run in non-interactive batch mode (`vitest run`).

---

### TASK-11: Correct Outdated Documentation & Update Technical Specifications
- **Priority:** P3 (Low)
- **Problem:**
  `backend/README.md`, `frontend/README.md`, and `backend/STACK.md` contain outdated information regarding supported endpoints, return payloads, environment variables, and CI checks.
- **Evidence:**
  - `frontend/README.md` claims verification code resending is not implemented.
  - `backend/README.md` omits `user` object in `/login` response documentation.
  - `backend/STACK.md` changelog ends at 2026-09-19.
- **Proposed Change:**
  1. Update `frontend/README.md` to document the `/resend-otp` route and correct CI check descriptions.
  2. Update `backend/README.md` to reflect complete response shapes and environment variables (`PORT`).
  3. Create root `README.md` detailing the full-stack architecture and local development instructions.
- **Affected Files:**
  - `backend/README.md`
  - `frontend/README.md`
  - `backend/STACK.md`
  - `README.md` (root)
- **Validation Steps:**
  - Review documentation for accuracy against actual controllers and routes.
- **Acceptance Criteria:**
  - All documented endpoints match actual request/response contracts.
  - Instructions for local development and environment setup are accurate.

---

### TASK-12: Address High-Priority Dependency Advisories & Fix Package Naming
- **Priority:** P3 (Low)
- **Problem:**
  1. `backend/package.json` contains `"name": "aith"` (typo).
  2. `npm audit` reports 20 backend advisories and 6 frontend advisories, including high-severity issues in `body-parser`, `zod`, `follow-redirects`, and critical in `proxy-addr`.
- **Evidence:**
  - `npm --prefix backend audit` output.
  - `backend/package.json#L2`.
- **Proposed Change:**
  1. Rename package to `"test-auth-backend"`.
  2. Execute safe `npm audit fix` for non-breaking patch/minor dependency updates.
- **Affected Files:**
  - `backend/package.json`
  - `backend/package-lock.json`
- **Validation Steps:**
  - Run `npm audit` after patch updates.
  - Execute full backend and frontend test suites to verify zero regressions.
- **Acceptance Criteria:**
  - Package name corrected.
  - Vulnerabilities remediated without breaking API behavior or test suites.

