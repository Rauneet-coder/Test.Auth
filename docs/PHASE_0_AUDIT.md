# Phase 0: Codebase Audit & Stabilization Report

**Repository:** `Rauneet-coder/Test.Auth`  
**Audit Date:** November 18, 2026  
**Auditor Roles:** Senior Staff Backend Engineer, Application Security Reviewer, QA Engineer, DevOps Engineer  
**Status:** Complete — Pending Remediation Approval  

---

## 1. Executive Summary

This audit assesses the state of `Test.Auth` prior to the development of new features (such as OAuth, RBAC, Password Reset, or MFA). The repository is a decoupled full-stack authentication platform consisting of an **Express 5 (ESM) backend** and a **React 19 (Vite) frontend**, supported by **MongoDB / Mongoose**, **Vitest**, and **Docker / GitHub Actions**.

### Key Findings
1. **Existing Core Logic & Tests:**
   - The core authentication mechanics (registration with rollback, CSPRNG OTP generation, attempt-limiting, atomic refresh-token rotation, and atomic session revocation) are implemented with high attention to concurrency and passing 100% of local automated test suites (53 backend tests, 63 frontend tests).
2. **CI/CD Pipeline Failure:**
   - GitHub Actions workflows for both backend and frontend are currently **failing in production CI** across all recent runs. The root cause is a malformed Docker Hub authentication configuration (`unknown: malformed HTTP Authorization header`) during the Docker image publish step, compounded by inconsistent Node.js runner versions and missing frontend build checks.
3. **Application Security & Hardening Gaps:**
   - **Account Enumeration:** The login endpoint differentiates between nonexistent users (`User not found`) and invalid passwords (`Invalid password`), enabling username harvesting.
   - **Missing Defense-in-Depth:** Neither `helmet` (security headers) nor `cors` middleware are registered in `app.js`.
   - **Rate Limiting & Cooldown Gaps:** While a global rate limiter protects `/api/auth`, there is no cooldown or dedicated rate limiter on `POST /api/auth/resend-otp` or `POST /api/auth/login`.
   - **Case Sensitivity Collision:** Email normalization (lowercasing and trimming) is missing in Mongoose models and Zod schemas, creating potential account duplication and collision vulnerabilities.
4. **Database & Operational Hygiene:**
   - **Infinite Session Accumulation:** Sessions in `sessionModel` have no TTL or expiry mechanism; revoked and stale sessions remain in MongoDB indefinitely.
   - **Missing Database Indexes:** Crucial query fields (`email` and `user` in `otpModel`, `refreshTokenHash` and `user` in `sessionModel`) lack explicit database indexes, forcing collection scans.
   - **Runtime Email Failure:** The Google OAuth2 email transport in `email.service.js` fails verification on boot in development/production due to expired OAuth credentials (`invalid_grant: Bad Request`).

---

## 2. Repository Architecture Map

```
Test.Auth/
├── .github/
│   └── workflows/
│       ├── backend.yml         # Backend CI: Lint, Vitest, Docker Hub build/push
│       └── frontend.yml        # Frontend CI: Test, Lint, Docker Hub build/push
├── backend/                    # Express 5 (Node.js ESM) backend service
│   ├── server.js               # Bootstrap entry point: connects DB & starts listener
│   ├── src/
│   │   ├── app.js              # Express app factory: middleware, routers, error handlers
│   │   ├── config/
│   │   │   ├── config.js       # Environment variable validation and loading
│   │   │   └── database.js     # Mongoose MongoDB connection management
│   │   ├── controllers/
│   │   │   └── auth.controller.js  # All 9 authentication endpoint controllers
│   │   ├── middlewares/
│   │   │   ├── authenticate.js # JWT Bearer validation & user population
│   │   │   ├── rateLimiter.js  # express-rate-limit configuration
│   │   │   └── validate.js     # Zod schema validation middleware
│   │   ├── models/
│   │   │   ├── otp.model.js    # OTP schema with attempt tracking & TTL
│   │   │   ├── session.model.js# Refresh session storage with rotation hashes
│   │   │   └── user.model.js   # User schema with bcrypt credentials & verification flag
│   │   ├── routes/
│   │   │   └── auth.routes.js  # Auth route wiring and middleware assignment
│   │   ├── services/
│   │   │   └── email.service.js# Nodemailer OAuth2 transport & email dispatch
│   │   ├── utils/
│   │   │   └── utils.js        # CSPRNG OTP generation & email HTML template
│   │   └── Validators/
│   │       └── auth.validator.js# Zod input schemas (register, login, OTP, resend)
│   ├── test/                   # Vitest unit & integration test suite
│   │   ├── setup.js            # Global setup: MongoMemoryServer management
│   │   ├── setup.worker.js     # Worker setup: env override & Mongoose connection
│   │   ├── units/              # Unit tests (email service, utility helpers)
│   │   └── integrations/       # Endpoint integration tests (supertest)
│   ├── Dockerfile              # Multi-stage production container build (Alpine)
│   ├── .dockerignore           # Excludes node_modules, .env, build, logs
│   ├── .env.example            # Backend template environment configuration
│   ├── eslint.config.js        # ESLint flat config
│   ├── package.json            # Backend dependencies, scripts, and engine specs
│   └── STACK.md                # Backend architecture and design decision reference
├── frontend/                   # React 19 + Vite SPA workspace
│   ├── src/
│   │   ├── main.jsx / App.jsx  # Application entry and workspace mount
│   │   ├── components/
│   │   │   ├── auth/           # Form components, inputs, password checklist, OTP field
│   │   │   ├── inspector/      # Session inspector, live response viewer, request history
│   │   │   ├── system/         # Connection notice, error boundary
│   │   │   └── workspace/      # Layout frames, sidebar, mobile nav, API guides
│   │   ├── hooks/
│   │   │   └── useAuthWorkspace.js # Centralized state machine & request locking
│   │   ├── lib/                # Form validation, response inspection, redaction helpers
│   │   ├── services/
│   │   │   └── api.js          # Axios client with contract assertions & token handling
│   │   └── styles/             # Design tokens and component styles
│   ├── test/                   # Native Node.js test runner suite (test/*.test.js)
│   ├── Dockerfile              # Multi-stage build (Vite build + Nginx Alpine)
│   ├── nginx.conf              # SPA static server configuration
│   ├── vite.config.js          # Vite config with /api proxy target to localhost:3000
│   └── package.json            # Frontend dependencies (React 19, Axios, Oxlint, Vite)
└── docs/                       # Architectural and verification documentation
    ├── auth-security.md        # Threat model & concurrency guarantees
    ├── design-direction.md     # Frontend design standards
    └── ux-verification.md      # UI test verification report
```

### Directory Responsibilities & Boundary Analysis
- **`backend/src/controllers/auth.controller.js`**: Monolithic controller holding all business logic across all 9 authentication endpoints. While cohesive, it directly handles token signing, hashing, database mutations, and email dispatch.
- **`backend/src/Validators/`**: Uses Zod for input validation. However, the directory name is PascalCase (`Validators/`) while all other backend directories are lowercase (`controllers/`, `middlewares/`, `models/`, `routes/`, `services/`, `utils/`).
- **`frontend/src/`**: Implements a dedicated testing and debugging playground for authentication flows with deep credential redaction in the UI.

---

## 3. Existing Authentication Feature Status Matrix

| Feature | Relevant Files | Existing Tests | Actual Behavior | Implementation Gaps & Bugs | Status |
|---|---|---|---|---|---|
| **Registration** | `auth.controller.js`, `auth.validator.js`, `user.model.js` | `test/integrations/register.test.js` (10 tests) | Validates payload, checks duplicates, hashes password with bcrypt (cost 12), creates user + OTP, sends email. Rolls back on email failure. Allows unverified user recovery. | Missing email lowercasing/trimming (case collision). Missing max password length (bcrypt 72-byte truncation). | **Implemented & Tested** |
| **Email Verification** | `auth.controller.js`, `auth.validator.js`, `otp.model.js` | `test/integrations/verify-email.test.js` (5 tests) | Validates 6-digit OTP, increments failed attempts, locks out after 5 attempts, marks user verified and deletes user OTPs. | Verification consumption is not atomic across concurrent requests (two identical valid requests can both pass before `deleteMany`). | **Implemented & Tested** |
| **Resend OTP** | `auth.controller.js`, `auth.validator.js`, `otp.model.js` | `test/integrations/resend-otp.test.js` (7 tests) | Validates email, ensures user is unverified, deletes old OTPs, generates new code, dispatches email. | **No cooldown period** between resends. **No endpoint-specific rate limiting** (vulnerable to email bombing). | **Partially Implemented** |
| **Login** | `auth.controller.js`, `auth.validator.js`, `user.model.js`, `session.model.js` | `test/integrations/login.test.js` (6 tests) | Validates credentials, checks verification status, verifies bcrypt hash, signs 15m access token and 7d refresh token, creates DB session, sets HttpOnly cookie. | **Account enumeration:** returns "User not found" vs "Invalid password". Hardcoded `secure: true` on cookie breaks non-localhost HTTP testing. | **Implemented & Tested** |
| **Access Token** | `authenticate.js`, `config.js` | `test/integrations/me.test.js` (5 tests) | Signs and verifies HS256 JWT, enforces exact `tokenUse: "access"` claim, populates `req.user`. | Same secret (`JWT_SECRET`) used for both access and refresh tokens. | **Implemented & Tested** |
| **Refresh Token** | `auth.controller.js`, `session.model.js` | `test/integrations/refresh.test.js` (8 tests) | Reads cookie, verifies `tokenUse: "refresh"`, atomically updates `refreshTokenHash` via conditional `findOneAndUpdate`. | Stale/revoked sessions accumulate indefinitely (no TTL). Replay of already-rotated token returns 401 but does not invalidate entire session family. | **Implemented & Tested** |
| **Logout** | `auth.controller.js`, `session.model.js` | `test/integrations/logout.test.js` (3 tests) | Reads cookie, verifies token, atomically marks session `revoked: true`, clears cookie. | None. Contract verified. | **Implemented & Tested** |
| **Logout All** | `auth.controller.js`, `session.model.js` | `test/integrations/logout.test.js` (3 tests) | Validates active session, marks all sessions for `decoded.id` as `revoked: true`, clears cookie. | Unindexed update on `user` field in `sessionModel`. | **Implemented & Tested** |
| **Protected Routes** | `authenticate.js`, `auth.routes.js` | `test/integrations/me.test.js` (5 tests) | Middleware blocks requests missing or with invalid Bearer token. | None. Contract verified. | **Implemented & Tested** |
| **Current User (`/me`)** | `auth.controller.js`, `authenticate.js` | `test/integrations/me.test.js` (5 tests) | Returns `{ message: "User found", user: { username, email } }` for valid Bearer token. | None. Contract verified. | **Implemented & Tested** |
| **Rate Limiting** | `rateLimiter.js`, `auth.routes.js` | `test/integrations/rate-limit.test.js` (1 test) | Applies 100 req / 15 min memory limiter across `/api/auth` (1000 in test mode). | Memory store does not scale across instances. Missing tighter per-endpoint limits for `/login` and `/resend-otp`. | **Partially Implemented** |
| **Error Handling** | `app.js`, `validate.js` | Covered across integration suites | Express 5 catches async errors, logs server-side, returns JSON 500 without leaking stack trace. Zod returns field-level errors. | Inconsistent error payload formats: `{ errors: [...] }` vs `{ message: "..." }` vs `{ error: "...", message: "..." }`. | **Implemented & Tested** |

---

## 4. Test Execution Results

All available validation commands were executed directly in the project environment.

### Summary Table

| Test Suite | Execution Command | Result | Exit Status | Details |
|---|---|---|---|---|
| **Backend Lint** | `npm --prefix backend run lint` | **PASS** | 0 | ESLint flat config checked backend files cleanly. |
| **Backend Unit & Integration Tests** | `npm --prefix backend run test-run` | **PASS** | 0 | 11 test files passed, 53 tests passed (in-memory MongoDB). |
| **Frontend Lint** | `npm --prefix frontend run lint` | **PASS** | 0 | Oxlint passed across 39 files with 0 warnings and 0 errors. |
| **Frontend Tests** | `npm --prefix frontend run test` | **PASS** | 0 | Node test runner passed all 63 unit and contract tests. |
| **Frontend Production Build** | `npm --prefix frontend run build` | **PASS** | 0 | Vite built production bundle (333.1 kB total gzip ~97 kB) in 117ms. |
| **Backend Production Module Smoke Test** | `node -e 'import("./backend/src/app.js")'` | **WARNING** | 0 | Express app initializes, but `email.service.js` logs Google OAuth `EAUTH invalid_grant`. |
| **Docker Build Check** | `docker info` | **BLOCKED** | - | Local Docker daemon is not active in this development environment. |
| **GitHub Actions CI Pipeline** | `gh run list` | **FAIL** | 1 | 10 consecutive failed runs on Docker Hub publish step. |

### Verification Details
1. **Backend Tests:**
   - Command: `npm --prefix backend run test-run`
   - Test files executed:
     - `test/integrations/register.test.js` (10 tests)
     - `test/integrations/login.test.js` (6 tests)
     - `test/integrations/verify-email.test.js` (5 tests)
     - `test/integrations/resend-otp.test.js` (7 tests)
     - `test/integrations/refresh.test.js` (8 tests)
     - `test/integrations/logout.test.js` (6 tests)
     - `test/integrations/me.test.js` (5 tests)
     - `test/integrations/rate-limit.test.js` (1 test)
     - `test/integrations/healthcheck.test.js` (1 test)
     - `test/units/email.test.js` (1 test)
     - `test/units/utils.test.js` (3 tests)
   - Total: **11 passed, 53 passed**.
2. **Frontend Tests:**
   - Command: `npm --prefix frontend run test`
   - Total: **63 passed, 0 failed**.
3. **CI Run Log Inspection:**
   - GitHub Actions Run ID: `43615488894` (Backend) & `43610107437` (Frontend).
   - Step: `Login to Docker Hub` / `Build and Push Docker image`
   - Output:
     `Error response from daemon: Get "https://registry-1.docker.io/v2/": unknown: malformed HTTP Authorization header`
     `##[error]Process completed with exit code 1.`

---

## 5. Database and Data Integrity Audit

### Mongoose Models Breakdown

#### 1. `backend/src/models/user.model.js`
- **Fields:** `username` (String, required, unique), `email` (String, required, unique), `password` (String, required), `verified` (Boolean, default false).
- **Index creation:** Declares `{ autoIndex: true }`.
- **Integrity Findings:**
  - `email` and `username` lack `trim: true` and `lowercase: true`. An email registered as `User@Domain.com` will not collide at the database level with `user@domain.com`, allowing duplicate accounts representing the same identity.
  - No collation defined for case-insensitive unique indexes.

#### 2. `backend/src/models/otp.model.js`
- **Fields:** `email` (String, required), `user` (ObjectId, ref `"users"`, required), `otpHash` (String, required), `failedAttempts` (Number, default 0), `maxAttempts` (Number, default 5), `createdAt` (Date), `deletedAt` (Date, default `Date.now() + 300s`, `expires: 0`).
- **Integrity Findings:**
  - **Missing Indexes:** Neither `email` nor `user` is indexed. Finding the latest OTP (`findOne({ email, deletedAt: { $gt: new Date() } }).sort({ createdAt: -1 })`) causes a collection scan.
  - **Schema Reference Mismatch:** `ref: "users"` (lowercase) does not match the registered Mongoose model name `"Users"` (capitalized) in `user.model.js`. Any future use of `.populate("user")` will throw a `MissingSchemaError`.
  - **Redundant Timestamps:** Schema defines `timestamps: true` while also explicitly declaring a `createdAt` field.

#### 3. `backend/src/models/session.model.js`
- **Fields:** `user` (ObjectId, ref `"users"`, required), `refreshTokenHash` (String, required), `ip` (String, required), `userAgent` (String, required), `revoked` (Boolean, default false).
- **Integrity Findings:**
  - **Unbounded Storage Leak:** There is **no TTL index** and no expiry date field on sessions. Sessions marked `revoked: true` or expired remain in the database permanently.
  - **Missing Indexes:** No index on `refreshTokenHash`, `user`, or `revoked`. Every atomic token rotation (`findOneAndUpdate({ refreshTokenHash, revoked: false })`) and bulk revocation (`updateMany({ user, revoked: false })`) performs a collection scan.
  - **Schema Reference Mismatch:** Same `ref: "users"` vs model name `"Users"`.

### Concurrency & Race Condition Analysis
- **Refresh Token Rotation:** `findOneAndUpdate` on `{ refreshTokenHash, revoked: false }` provides atomic protection. Concurrent requests presenting the same token will result in exactly one successful rotation; subsequent requests find no match and receive 401. **(Verified and Safe)**.
- **Logout:** Conditional update on `{ refreshTokenHash, revoked: false }` is atomic. **(Verified and Safe)**.
- **OTP Verification:** `verifyEmail` first performs `findOne`, checks `inputHash`, updates the user, and then deletes the OTP with `deleteMany`. If two identical verification requests arrive concurrently with the correct code, both can evaluate true before either deletes the OTP record. While both set `verified: true`, this is not strictly atomic.
- **OTP Attempt Increment:** Failed attempts increment atomically via `{ $inc: { failedAttempts: 1 } }`. **(Verified and Safe)**.

---

## 6. Docker and CI/CD Stabilization

### Current Pipeline Architecture
- `.github/workflows/backend.yml`:
  - Triggers on push/PR modifying `backend/**` or `backend.yml`.
  - Job `lint`: Node 20, runs `npm ci` and `npm run lint`.
  - Job `test`: Node 24, runs `npm ci` and `npm test`.
  - Job `docker`: Triggers on push to `main`. Executes manual `docker login` piped from `${{ secrets.DOCKER_PASSWORD }}`, then runs `docker/build-push-action@v6`.
- `.github/workflows/frontend.yml`:
  - Triggers on push/PR modifying `frontend/**` or `frontend.yml`.
  - Job `check`: Node 24, runs `npm test` and `npm run lint`.
  - Job `docker`: Triggers on push to `main`. Custom bash script sanitizes `DOCKER_USERNAME` and `DOCKER_PASSWORD`, lowercases repository owner, and executes `docker build` / `docker push`.

### Root Cause Analysis of CI Failures
1. **Malformed HTTP Authorization Header:**
   - Both workflows fail with: `Error response from daemon: Get "https://registry-1.docker.io/v2/": unknown: malformed HTTP Authorization header`.
   - In `backend.yml`, `echo "$DOCKER_TOKEN" | docker login` writes to a custom `DOCKER_CONFIG: ${{ runner.temp }}/docker-config`, which is ignored by subsequent buildx actions unless propagated, or fails when the secret contains unexpected whitespace or invalid characters.
   - In `frontend.yml`, custom bash parsing with `sed` and `printf` fails to authenticate cleanly with Docker Hub daemon API.
   - **Recommended Solution:** Replace brittle custom shell scripts with the official, battle-tested `docker/login-action@v3`. Guard against missing secrets so external forks or PRs without Docker Hub credentials fail gracefully or skip publishing without failing CI.
2. **Missing Frontend Build Step:**
   - `frontend.yml` runs `npm test` and `npm run lint`, but **never runs `npm run build`**! A syntax error or bundling failure that only occurs during Vite production build would pass CI undetected.
3. **Vitest Watch Mode in Backend CI:**
   - In `backend.yml`, the test step executes `npm test`. In `backend/package.json`, `"test": "vitest"` (which defaults to watch mode when not in CI). While GitHub Actions sets `CI=true`, running `npm run test-run` (`vitest run`) is explicit and prevents accidental process hanging.
4. **Node Version Inconsistencies:**
   - In `backend.yml`, `lint` runs on Node 20 while `test` runs on Node 24. They should be aligned on Node 20 (or 24) consistently.
5. **Docker Container Hardening:**
   - `backend/Dockerfile` runs as non-root (`appuser`), but lacks a `HEALTHCHECK` instruction.
   - `frontend/Dockerfile` uses standard `nginx:alpine` and runs as root. It should be hardened with an unprivileged nginx user and include a `HEALTHCHECK`.

---

## 7. Security Pre-Audit Findings

### Findings Summary Table

| Finding ID | Severity | Category | File & Line | Evidence / Vulnerability | Potential Impact | Confirmation | Recommended Mitigation |
|---|---|---|---|---|---|---|---|
| **SEC-01** | **High** | API Security | `backend/src/controllers/auth.controller.js#L96-L107` | Differentiates `User not found` (line 97) vs `Invalid password` (line 106). | Account enumeration: attackers can harvest valid user emails. | Confirmed | Return generic `Invalid email or password` for both missing user and bad password. |
| **SEC-02** | **High** | API Security | `backend/src/app.js#L10-L15` | No `helmet` middleware registered. | Missing standard HTTP security headers (HSTS, X-Content-Type-Options, CSP, Frameguard). | Confirmed | Install and register `helmet()` in `app.js`. |
| **SEC-03** | **High** | API Security | `backend/src/app.js#L10-L15` | No `cors` middleware registered. | Browser blocks cross-origin frontend requests when `VITE_API_URL` is set to a separate origin. | Confirmed | Register `cors()` configured with explicit allowed origins and `credentials: true`. |
| **SEC-04** | **Medium** | Auth & Tokens | `backend/src/config/config.js#L34`, `auth.controller.js` | Same `JWT_SECRET` used for signing both access tokens and refresh tokens. | Key compromise for access token verification compromises refresh token signing authority. | Confirmed | Separate into `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (or document migration path). |
| **SEC-05** | **Medium** | OTP Security | `backend/src/routes/auth.routes.js#L42-L43` | No cooldown or dedicated rate limit on `/resend-otp`. | Email inbox bombing and third-party email quota exhaustion. | Confirmed | Implement a 60-second cooldown per email and a dedicated tight rate limiter (e.g. 5 requests / 15 min). |
| **SEC-06** | **Medium** | Password Security | `backend/src/Validators/auth.validator.js#L9-L14` | No maximum length on password schema. | Bcrypt silently truncates passwords at 72 bytes; potential CPU DoS with extremely large passwords. | Confirmed | Add `.max(72, "Password must not exceed 72 characters")` to `RegisterSchema`. |
| **SEC-07** | **Medium** | Data Integrity | `backend/src/models/user.model.js#L9-L14` | `email` schema lacks `lowercase: true` and `trim: true`. | Account duplication: `user@example.com` and `User@example.com` can both register. | Confirmed | Add `lowercase: true, trim: true` to schema and normalize in validator/controller. |
| **SEC-08** | **Medium** | Data Integrity | `backend/src/models/session.model.js` | No TTL index or cleanup for expired/revoked sessions. | Unbounded database growth; stale sessions persist permanently. | Confirmed | Add `createdAt` TTL index or `expiresAt` with Mongo TTL index (`expireAfterSeconds: 0`). |
| **SEC-09** | **Low** | Cookie Security | `backend/src/controllers/auth.controller.js#L134, L222` | Cookie option `secure: true` hardcoded. | Browsers over plain HTTP on LAN/Docker IP reject cookie, breaking non-localhost dev setups. | Confirmed | Use `secure: process.env.NODE_ENV === "production"`. |
| **SEC-10** | **Low** | Docker Security | `frontend/Dockerfile#L13` | Nginx stage runs as root. | Container breakout risks if Nginx is compromised. | Confirmed | Use `nginxinc/nginx-unprivileged:alpine` or configure non-root worker. |
| **SEC-11** | **High** | Dependencies | `backend/package.json`, `frontend/package.json` | 20 backend vulnerabilities (1 Critical, 14 High); 6 frontend vulnerabilities. | `proxy-addr` IP spoofing (Critical), `mongoose` prototype pollution/virtual DoS, `zod` DoS. | Confirmed | Run audited, non-breaking dependency updates (`npm audit fix`). |

---

## 8. Dependency and Configuration Audit

### Backend Dependencies (`backend/package.json`)
- **`express: ^5.2.1`**: Modern Express 5 handles async rejections natively.
- **`mongoose: ^9.9.5`**: Up to date, but has open security advisories (GHSA-8332-j7wj-wjw4, GHSA-gg4r-jv3p-qx3c).
- **`zod: ^4.6.5`**: Zod 4 canary/prerelease syntax. Memory exhaustion advisory on constrained collections.
- **`nodemailer: ^10.0.9`**: Advisories regarding header parsing.
- **`bcrypt: ^6.0.0`**: Native binding. Compiles fine in Node 20/24.
- **Package Name Typo:** In `backend/package.json`, `"name": "aith"` is a typo for `"auth"` or `"test-auth"`.

### Frontend Dependencies (`frontend/package.json`)
- **`react: ^19.2.8` & `react-dom: ^19.2.8`**: React 19 production build verified.
- **`axios: ^1.20.0`**: Axios with follow-redirects advisory.
- **`oxlint: ^1.81.0`**: Fast Rust-based linter, configured cleanly via `.oxlintrc.json`.
- **`vite: ^8.3.0`**: Fast bundle times.

### Environment Variable & Configuration Inconsistencies
1. **`PORT` Environment Variable:**
   - `backend/.env.example` documents `PORT=3000`.
   - `backend/server.js` ignores `process.env.PORT` and hardcodes `app.listen(3000)`.
   - `backend/src/config/config.js` does not parse or export `PORT`.
2. **Email OAuth2 Configuration in Development:**
   - In `backend/src/config/config.js`, non-test environments require all Google OAuth credentials.
   - When configured with test/placeholder values or expired tokens, `email.service.js` logs `invalid_grant: Bad Request` upon startup.
3. **Database Connection Error Handling:**
   - `server.js` invokes `connectDB()` without `await`, immediately followed by `app.listen(3000)`. The HTTP server accepts traffic before database connectivity is established.

---

## 9. Documentation Audit

1. **`backend/README.md`:**
   - Claims `POST /api/auth/login` returns `{ "message", "accessToken" }`, omitting the returned `user: { username, email }` object.
   - Documents `PORT` in `.env.example`, but `server.js` hardcodes 3000.
   - Documents `GET /api/auth/health-check` returning `{ message: "OK" }`, but `app.js` also has `GET /health` returning `{ status: "ok", uptime, timestamp }`. Both exist, but their purposes should be clarified.
2. **`frontend/README.md`:**
   - Inaccurately states: *"Google/GitHub sign-in, password resets, and verification-code resending are unavailable because the backend has no corresponding endpoints."*
   - Verification code resending **was implemented** in `backend/src/routes/auth.routes.js` (`/resend-otp` and `/resend-verification`). The frontend documentation is outdated.
   - Claims *"Frontend CI runs all three checks (test, lint, build)."* In reality, `frontend.yml` only runs test and lint.
   - Refers to project as *"Aith"* rather than `Test.Auth`.
3. **`backend/STACK.md`:**
   - "Last updated: 2026-09-19". Does not document Vitest in-memory MongoDB test harness, OTP attempt tracking, OTP resend, or atomic session rotation.
4. **Missing Root Documentation:**
   - There is no root `README.md` explaining the monorepo structure, repository scripts, and how to start both backend and frontend together.

---

## 10. Confirmed Bugs

1. **Bug 1: Docker Publishing Failure in GitHub Actions**
   - **Location:** `.github/workflows/backend.yml#L65-L77`, `.github/workflows/frontend.yml#L40-L65`
   - **Symptom:** Every push to `main` fails at the Docker login/push step with `unknown: malformed HTTP Authorization header`.
   - **Impact:** Automated image publishing is completely broken.
2. **Bug 2: Account Enumeration on Login**
   - **Location:** `backend/src/controllers/auth.controller.js#L96-L107`
   - **Symptom:** Nonexistent email yields 400 `User not found`; incorrect password yields 400 `Invalid password`.
   - **Impact:** Attackers can systematically discover registered email addresses.
3. **Bug 3: Server Ignores Configured `PORT`**
   - **Location:** `backend/server.js#L6`
   - **Symptom:** `app.listen(3000)` ignores `process.env.PORT` or `config.PORT`.
   - **Impact:** Cannot configure custom ports in containerized or PaaS environments.
4. **Bug 4: Server Accepts Traffic Before Database Connection**
   - **Location:** `backend/server.js#L4-L6`
   - **Symptom:** `connectDB()` is called synchronously without awaiting its promise before `app.listen()`.
   - **Impact:** Requests arriving immediately on boot fail with database timeout errors.
5. **Bug 5: Missing Case Normalization on Registration**
   - **Location:** `backend/src/controllers/auth.controller.js#L18-L25`, `backend/src/models/user.model.js#L9-L14`
   - **Symptom:** Querying `$or: [{ username }, { email }]` is case-sensitive.
   - **Impact:** `test@example.com` and `Test@example.com` can create separate accounts with separate passwords.
6. **Bug 6: Frontend CI Omits Build Step**
   - **Location:** `.github/workflows/frontend.yml#L20-L29`
   - **Symptom:** Job `check` only runs `npm test` and `npm run lint`.
   - **Impact:** Broken builds can be merged to `main`.

---

## 11. Unverified Assumptions

1. **Docker Hub Secrets Value Format:**
   - Assumption: `secrets.DOCKER_USERNAME` and `secrets.DOCKER_PASSWORD` in GitHub repository secrets are valid Docker Hub Personal Access Tokens without leading/trailing whitespace, quotes, or non-ASCII characters.
   - Verification needed: Secret values cannot and must not be read directly; however, standard action `docker/login-action@v3` must be validated against GitHub Secrets.
2. **Production MongoDB Deployment Mode:**
   - Assumption: Production MongoDB will support standard single-document atomic operations and TTL background threads.
   - Verification needed: Ensure production MongoDB cluster has TTL index monitor enabled (default in MongoDB Atlas).
3. **Email Transport Provider:**
   - Assumption: In production, Gmail OAuth2 or an SMTP relay will be configured with active credentials. Currently, local dev credentials yield `invalid_grant: Bad Request`.

---

## 12. Prioritized Remediation Backlog

See [`docs/PHASE_0_REMEDIATION.md`](./PHASE_0_REMEDIATION.md) for full execution plans and acceptance criteria.

| Priority | Task ID | Description | Affected Files |
|---|---|---|---|
| **P0 (Critical)** | **TASK-01** | Fix and stabilize Docker Hub CI/CD workflows for Backend and Frontend | `.github/workflows/backend.yml`, `.github/workflows/frontend.yml` |
| **P0 (Critical)** | **TASK-02** | Add frontend production build validation to CI workflow | `.github/workflows/frontend.yml` |
| **P1 (High)** | **TASK-03** | Fix account enumeration vulnerability in login endpoint | `backend/src/controllers/auth.controller.js`, `backend/test/integrations/login.test.js` |
| **P1 (High)** | **TASK-04** | Install and configure Helmet and CORS security middleware in Express app | `backend/src/app.js`, `backend/package.json` |
| **P1 (High)** | **TASK-05** | Support dynamic `PORT` and await database connection prior to listening | `backend/server.js`, `backend/src/config/config.js` |
| **P1 (High)** | **TASK-06** | Enforce email normalization (lowercase & trim) across models, validators, and controllers | `backend/src/models/user.model.js`, `backend/src/Validators/auth.validator.js`, `backend/src/controllers/auth.controller.js` |
| **P2 (Medium)** | **TASK-07** | Add database indexes and TTL expiration for session and OTP models | `backend/src/models/session.model.js`, `backend/src/models/otp.model.js` |
| **P2 (Medium)** | **TASK-08** | Add 60-second cooldown and attempt limiter for OTP resend endpoint | `backend/src/controllers/auth.controller.js`, `backend/src/routes/auth.routes.js`, tests |
| **P2 (Medium)** | **TASK-09** | Add password maximum length limit (72 bytes) to prevent bcrypt truncation | `backend/src/Validators/auth.validator.js` |
| **P2 (Medium)** | **TASK-10** | Align Node.js versions in CI and use `npm run test-run` | `.github/workflows/backend.yml`, `backend/package.json` |
| **P3 (Low)** | **TASK-11** | Update outdated and inaccurate documentation | `backend/README.md`, `frontend/README.md`, `backend/STACK.md` |
| **P3 (Low)** | **TASK-12** | Fix package naming typos and audit dependency security advisories | `backend/package.json` |

---

## 13. Phase 0 Completion Checklist

- [x] Complete directory, entry point, route, model, and workflow inspection.
- [x] Verify Git history and recent commits.
- [x] Run backend lint, backend tests, frontend lint, frontend tests, and frontend build.
- [x] Inspect CI/CD logs and diagnose Docker Hub publishing failure root causes.
- [x] Audit database integrity, race conditions, and session storage behavior.
- [x] Complete security pre-audit covering tokens, passwords, OTPs, API, and infra.
- [x] Complete dependency and documentation gap analysis.
- [x] Create comprehensive Phase 0 audit report (`docs/PHASE_0_AUDIT.md`).
- [x] Create structured remediation backlog (`docs/PHASE_0_REMEDIATION.md`).
- [x] Await user review and explicit approval on remediation tasks.
- [x] Execute approved Phase 0 fixes one task at a time with test verification (Tasks 3 through 12 completed and verified: 58 backend tests passing, 63 frontend tests passing, build passing).
- [ ] Task 01 & Task 02 (Docker Hub workflow stabilization and frontend build validation in CI) pending user confirmation.

