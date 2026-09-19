# STACK.md — Technology & Decision Reference

> **Purpose:** A living reference document that explains every package, pattern,
> design decision, and Node.js built-in used in this codebase — what it is,
> why it was chosen, and exactly where it is used.
>
> **Keep this file up to date.** Every time a new package is added, a pattern
> changes, or a design decision is made, update the relevant section here.
>
> Last updated: 2026-09-19

---

## Table of Contents

1. [Runtime & Module System](#1-runtime--module-system)
2. [Project Entry Points](#2-project-entry-points)
3. [npm Dependencies](#3-npm-dependencies)
   - [express](#express)
   - [mongoose](#mongoose)
   - [jsonwebtoken](#jsonwebtoken)
   - [bcrypt](#bcrypt)
   - [cookie-parser](#cookie-parser)
   - [dotenv](#dotenv)
   - [morgan](#morgan)
   - [nodemailer](#nodemailer)
   - [nodemon](#nodemon)
   - [zod](#zod)
4. [Dev Dependencies](#4-dev-dependencies)
   - [eslint + @eslint/js + globals](#eslint--eslintjs--globals)
5. [Node.js Built-ins Used](#5-nodejs-built-ins-used)
   - [crypto](#crypto)
6. [Source-Code Architecture](#6-source-code-architecture)
   - [Folder structure](#folder-structure)
   - [Config layer](#config-layer)
   - [Database layer](#database-layer)
   - [Models layer](#models-layer)
   - [Middlewares layer](#middlewares-layer)
   - [Validators layer](#validators-layer)
   - [Controllers layer](#controllers-layer)
   - [Services layer](#services-layer)
   - [Utils layer](#utils-layer)
   - [Routes layer](#routes-layer)
7. [Security Patterns & Design Decisions](#7-security-patterns--design-decisions)
8. [Environment Variables](#8-environment-variables)
9. [npm Scripts](#9-npm-scripts)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Docker Setup](#11-docker-setup)
12. [Changelog](#12-changelog)

---

## 1 · Runtime & Module System

| Item | Value | Why |
|---|---|---|
| **Runtime** | Node.js ≥ 20 | LTS, supports `crypto.randomInt`, top-level await, and native ESM without flags |
| **Module system** | ESM (`"type": "module"` in package.json) | Native `import/export` syntax; no CommonJS `require()`. Cleaner, future-proof, tree-shakeable |
| **Syntax** | ES2022+ (async/await, optional chaining `?.`, nullish coalescing `??`) | Keeps code readable and avoids callback pyramids |

---

## 2 · Project Entry Points

| File | Role |
|---|---|
| [`server.js`](./server.js) | Thin bootstrap — connects DB, calls `app.listen(3000)`. Kept separate from app.js so the app can be imported in tests without actually starting a port listener |
| [`src/app.js`](./src/app.js) | Express application factory — registers all middleware and routes, then exports `app` |

---

## 3 · npm Dependencies

### express

- **Package:** `express ^5.2.1`
- **Used in:** [`src/app.js`](./src/app.js), [`src/routes/auth.routes.js`](./src/routes/auth.routes.js)
- **What it is:** The HTTP server framework that handles routing, middleware chaining, and the request/response lifecycle.
- **Why Express 5 specifically:**
  - Express 5 **automatically forwards async rejections** to the error handler. In Express 4, an unhandled promise rejection inside a route would crash the process; in Express 5 it is caught and passed to `app.use((err, req, res, next) => …)` automatically.
  - This means we do not need an `asyncHandler` wrapper around every controller.
- **Key usage patterns in this project:**
  - `app.use(middleware)` — registers global middleware (morgan, json parser, cookie-parser)
  - `app.use("/api/auth", authRouter)` — mounts the auth router under a prefix
  - `app.get("/health", handler)` — the health-check endpoint
  - `app.use((_req, res) => …)` — 404 catch-all (must come after all routes)
  - `app.use((err, _req, res, _next) => …)` — global error handler (4-argument signature tells Express this is an error handler)

---

### mongoose

- **Package:** `mongoose ^9.9.5`
- **Used in:** [`src/config/database.js`](./src/config/database.js), all model files
- **What it is:** An ODM (Object-Document Mapper) for MongoDB. Lets us define typed schemas and interact with MongoDB using JavaScript objects instead of raw query strings.
- **Why Mongoose over the raw MongoDB driver:**
  - Schema enforcement — fields are typed and required errors are descriptive
  - `unique` index declaration lives next to the field definition
  - Built-in `timestamps: true` option adds `createdAt` / `updatedAt` automatically
  - `.select("-password")` cleanly excludes sensitive fields from query results
- **Key patterns used:**
  - `mongoose.Schema` — define the shape and constraints of a document
  - `mongoose.model("CollectionName", schema)` — creates a Model class bound to a MongoDB collection
  - `Model.create({…})` — inserts a new document
  - `Model.findOne({…})` — finds one document matching a filter
  - `Model.findById(id)` — finds by `_id`
  - `Model.findByIdAndUpdate(id, update, { new: true })` — update and return the updated document
  - `Model.deleteMany({…})` — delete multiple documents
  - `Model.updateMany({…}, {…})` — bulk update
  - `.select("-password")` — projection that excludes the password hash

---

### jsonwebtoken

- **Package:** `jsonwebtoken ^9.0.3`
- **Used in:** [`src/controllers/auth.controller.js`](./src/controllers/auth.controller.js), [`src/middlewares/authenticate.js`](./src/middlewares/authenticate.js)
- **What it is:** Signs and verifies JSON Web Tokens (JWT). A JWT is a compact, URL-safe string that encodes claims (like a user ID) and is cryptographically signed so the server can verify it hasn't been tampered with.
- **Why JWT for access tokens:**
  - Stateless — the server doesn't need to query the DB on every request (the signature proves authenticity)
  - Short-lived (15 minutes) — if stolen, exposure window is small
  - Pairs well with a stateful refresh token for long sessions
- **How it's used here:**

  | Call | Where | Purpose |
  |---|---|---|
  | `jwt.sign({ id }, secret, { expiresIn: "15m" })` | `login`, `refreshToken` controller | Issue a short-lived access token |
  | `jwt.sign({ id }, secret, { expiresIn: "7d" })` | `login`, `refreshToken` controller | Issue a long-lived refresh token |
  | `jwt.verify(token, secret)` | `authenticate` middleware, `refreshToken`, `logout`, `logoutAll` controllers | Verify and decode a token; throws on failure |

- **Algorithm:** HS256 (default) — HMAC-SHA256 with a shared secret. Both signing and verification use `JWT_SECRET` from environment variables.

---

### bcrypt

- **Package:** `bcrypt ^6.0.0`
- **Used in:** [`src/controllers/auth.controller.js`](./src/controllers/auth.controller.js)
- **What it is:** A password-hashing library that uses the bcrypt adaptive algorithm — intentionally slow (via a "cost factor") to make brute-force attacks expensive.
- **Why bcrypt and NOT `crypto.createHash("sha256")`:**
  - SHA-256 is a general-purpose fast hash — it can compute billions of hashes per second. Bcrypt is purpose-built for passwords: cost factor 12 takes ~250ms per hash, making brute-force computationally prohibitive.
  - Bcrypt automatically generates and stores a salt, preventing rainbow-table attacks.
  - The old SHA-256 approach was intentionally left as a commented-out note in the controller to explain the decision.
- **Cost factor:** `12` — a good production value that balances security and response time (~250ms on a modern server).
- **Key calls:**

  | Call | Where | Purpose |
  |---|---|---|
  | `bcrypt.hash(password, 12)` | `registerUser` | Hash a plaintext password before storing |
  | `bcrypt.compare(plaintext, hash)` | `login` | Constant-time comparison of submitted password vs stored hash |

---

### cookie-parser

- **Package:** `cookie-parser ^1.4.7`
- **Used in:** [`src/app.js`](./src/app.js) (globally), [`src/controllers/auth.controller.js`](./src/controllers/auth.controller.js) (reads `req.cookies`)
- **What it is:** Parses the `Cookie` HTTP header and exposes cookies as `req.cookies` (a plain object).
- **Why we use cookies for the refresh token and NOT the response body:**
  - `httpOnly: true` — JavaScript running in the browser cannot access the cookie. This blocks XSS attacks from stealing the refresh token.
  - `secure: true` — cookie is only sent over HTTPS. Prevents interception on plain HTTP.
  - `sameSite: "strict"` — cookie is not sent with cross-site requests. Mitigates CSRF.
  - Storing a long-lived token in `localStorage` or the response body would expose it to XSS.
- **Cookie options used:**
  ```js
  { httpOnly: true, secure: true, sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 }
  ```

---

### dotenv

- **Package:** `dotenv ^17.4.2`
- **Used in:** [`src/config/config.js`](./src/config/config.js) only — called once at startup via `dotenv.config()`
- **What it is:** Reads a `.env` file and injects its key-value pairs into `process.env` before the app starts.
- **Why we use it:**
  - Keeps secrets (DB URL, JWT secret, OAuth keys) out of source code
  - Different `.env` files can be used per environment (development, test, production)
- **Important:** `dotenv` is only imported once, inside `config.js`. All other files import the `config` object — they never touch `process.env` directly. This creates a single, validated source of truth for all configuration.

---

### morgan

- **Package:** `morgan ^1.12.0`
- **Used in:** [`src/app.js`](./src/app.js) — `app.use(morgan("dev"))`
- **What it is:** HTTP request logger middleware. Logs every incoming request and its response status/time to the console.
- **Format used:** `"dev"` — coloured, concise output:
  ```
  POST /api/auth/login 200 23.456 ms - 147
  ```
- **Why `"dev"` format:** Readable during local development. ⚠️ In production this should be switched to `"combined"` or a structured JSON logger (Pino/Winston) so log aggregators can parse it.

---

### nodemailer

- **Package:** `nodemailer ^10.0.9`
- **Used in:** [`src/services/email.service.js`](./src/services/email.service.js)
- **What it is:** A Node.js library for sending email via SMTP or API transports.
- **Transport used:** Gmail via OAuth2 (not a username/password — OAuth2 tokens are more secure and don't require "less secure app" settings).
- **Why OAuth2 over SMTP password:**
  - OAuth2 tokens can be revoked without changing the Gmail account password
  - Does not expose the Google account password in environment variables
- **How it works:**
  1. A `transporter` is created once at module load with the OAuth2 credentials
  2. `transporter.verify()` is called at startup — logs whether the email server connection succeeds
  3. `sendEmail(to, subject, text, html)` is the exported function called by controllers when an OTP email needs to go out

---

### nodemon

- **Package:** `nodemon ^3.1.14`
- **Used in:** `npm run dev` script only
- **What it is:** A development utility that watches source files and automatically restarts the Node.js process when a file changes.
- **Why it's in `dependencies` instead of `devDependencies`:** ⚠️ This is a **known issue** — it should be in `devDependencies` so it is not installed in the production Docker image. To be fixed.

---

### zod

- **Package:** `zod ^4.6.5`
- **Used in:** [`src/Validators/auth.validator.js`](./src/Validators/auth.validator.js), [`src/middlewares/validate.js`](./src/middlewares/validate.js)
- **What it is:** A TypeScript-first schema declaration and validation library. Works perfectly in plain JavaScript too.
- **Why Zod over express-validator or Joi:**
  - Schema definitions are concise and co-located
  - `safeParse` never throws — it returns `{ success, data, error }` which is easy to handle without try/catch
  - Error messages are field-specific and human-readable out of the box
- **Schemas defined:**

  | Schema | File | Used on route | What it validates |
  |---|---|---|---|
  | `RegisterSchema` | `auth.validator.js` | `POST /api/auth/register` | `username` (3–30 chars), `email` (valid format), `password` (min 8, must have uppercase + number + special char) |
  | `LoginSchema` | `auth.validator.js` | `POST /api/auth/login` | `email` (valid format), `password` (min 8 + complexity) |
  | `VerifyOtpSchema` | `auth.validator.js` | `POST /api/auth/verify-email` | `email` (valid format), `otp` (exactly 6 characters) |

---

## 4 · Dev Dependencies

### eslint + @eslint/js + globals

- **Packages:** `eslint ^9.28.0`, `@eslint/js ^9.28.0`, `globals ^16.1.0`
- **Config file:** [`eslint.config.js`](./eslint.config.js) (flat config format — ESLint 9+)
- **What it is:** A static analysis linter that catches code problems without running the code.
- **Rules enabled:**
  - `no-unused-vars` (warn) — catches dead variables
  - `no-undef` (error) — catches typos in variable names
  - `no-var` (error) — enforces `const`/`let` over old-style `var`
  - `prefer-const` (warn) — flags variables that are never reassigned
  - `eqeqeq` (error) — enforces `===` over `==`
  - `no-duplicate-imports` (error) — prevents importing the same module twice
- **`globals.node`** — tells ESLint that Node.js globals (`process`, `console`, `Buffer`, etc.) are valid identifiers
- **Run with:** `npm run lint` / `npm run lint:fix`

---

## 5 · Node.js Built-ins Used

### crypto

- **Module:** `node:crypto` (Node.js standard library — no npm install needed)
- **Used in:** [`src/controllers/auth.controller.js`](./src/controllers/auth.controller.js), [`src/utils/utils.js`](./src/utils/utils.js)
- **Why it's used over third-party libraries:** It's built-in, battle-tested, and already audited as part of Node.js itself.

| Function call | Where | What it does | Why |
|---|---|---|---|
| `crypto.randomInt(100000, 999999)` | `utils.js → generateOtp()` | Generates a cryptographically secure random integer between 100000 and 999999 | `Math.random()` is NOT cryptographically secure — an attacker can predict it. `crypto.randomInt` uses the OS CSPRNG (Cryptographically Secure Pseudo-Random Number Generator) |
| `crypto.createHash("sha256").update(otp).digest("hex")` | `auth.controller.js` | Hashes the raw OTP before storing it in the database | We never store the plaintext OTP. If the DB is breached, the attacker gets hashes not raw codes |
| `crypto.createHash("sha256").update(refreshToken).digest("hex")` | `auth.controller.js` | Hashes the raw refresh token before storing it in the session document | Same reason — the full token is only ever in the cookie. The DB stores only its fingerprint |

---

## 6 · Source-Code Architecture

### Folder structure

```
Aith/
├── server.js                  ← Bootstrap (start server)
├── src/
│   ├── app.js                 ← Express app factory
│   ├── config/
│   │   ├── config.js          ← Env var loading & validation
│   │   └── database.js        ← MongoDB connection
│   ├── models/
│   │   ├── user.model.js      ← Mongoose schema for users
│   │   ├── otp.model.js       ← Mongoose schema for OTP records
│   │   └── session.model.js   ← Mongoose schema for refresh-token sessions
│   ├── middlewares/
│   │   ├── authenticate.js    ← JWT auth middleware (populates req.user)
│   │   └── validate.js        ← Zod schema validation middleware
│   ├── Validators/
│   │   └── auth.validator.js  ← Zod schemas for request bodies
│   ├── controllers/
│   │   └── auth.controller.js ← Business logic for all auth endpoints
│   ├── services/
│   │   └── email.service.js   ← Nodemailer / Gmail OAuth2 email sender
│   ├── routes/
│   │   └── auth.routes.js     ← Route declarations + middleware chain
│   └── utils/
│       └── utils.js           ← OTP generation + HTML email template
├── .env.example               ← Template for required environment variables
├── Dockerfile                 ← Multi-stage production Docker image
├── .dockerignore
├── .gitignore
├── eslint.config.js
└── package.json
```

---

### Config layer

**Files:** [`src/config/config.js`](./src/config/config.js), [`src/config/database.js`](./src/config/database.js)

**Design decision — fail fast at startup:**  
`config.js` validates that every required environment variable is present the moment the process starts. If `MONGO_URL` is missing, the app throws before accepting a single request. This is intentional — a misconfigured deployment should be immediately obvious, not silently broken.

**CI exception:** Email config (`GOOGLE_*` variables) is optional when `NODE_ENV=test` or `NODE_ENV=ci` because CI doesn't send real emails.

---

### Database layer

**File:** [`src/config/database.js`](./src/config/database.js)

`connectDB()` is an async function called once in `server.js`. If MongoDB is unreachable, it logs the error and calls `process.exit(1)` — intentionally crashing instead of running in a broken state.

---

### Models layer

Three Mongoose models represent the three MongoDB collections:

#### `user.model.js` → collection: `Users`

| Field | Type | Notes |
|---|---|---|
| `username` | String | Required, unique |
| `email` | String | Required, unique |
| `password` | String | Required. Always bcrypt-hashed before saving, never stored plaintext |
| `verified` | Boolean | Default `false`. Set to `true` after OTP verification. Login is blocked if `false` |

#### `otp.model.js` → collection: `otps`

| Field | Type | Notes |
|---|---|---|
| `email` | String | Required. Denormalized from user for fast lookup by email |
| `user` | ObjectId | Required. Ref to `Users` collection |
| `otpHash` | String | Required. SHA-256 hash of the raw OTP. Raw OTP is never stored |
| `createdAt` / `updatedAt` | Date | Auto-generated by `timestamps: true` |

⚠️ **Known gap:** No `expiredAt` TTL index — OTPs currently never expire. See audit finding F-18.

#### `session.model.js` → collection: `sessions`

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId | Required. Ref to `Users` |
| `refreshTokenHash` | String | Required. SHA-256 hash of the refresh token. Raw token is only in the cookie |
| `ip` | String | IP address at login time. Stored for device-tracking / anomaly detection |
| `userAgent` | String | Browser/client identifier. Stored for device-tracking |
| `revoked` | Boolean | Default `false`. Set to `true` on logout. Checked on every `/refresh-token` call |
| `createdAt` / `updatedAt` | Date | Auto-generated by `timestamps: true` |

⚠️ **Known gap:** No TTL index — revoked/expired sessions accumulate forever. See audit finding F-15.

---

### Middlewares layer

**Files:** [`src/middlewares/authenticate.js`](./src/middlewares/authenticate.js), [`src/middlewares/validate.js`](./src/middlewares/validate.js)

#### `authenticate.js`

A reusable middleware that runs before any protected route controller. It:
1. Reads the `Authorization: Bearer <token>` header
2. Verifies the JWT with `jwt.verify()` inside a try/catch
3. Looks up the user by the decoded `id`, excluding the password hash
4. Attaches the user to `req.user`
5. Calls `next()` to hand off to the controller

**Why a middleware and not inline in every controller:**  
Single source of truth. If the auth logic ever changes (e.g., we add token-type checking or a denylist), we change one file, not every controller.

**Usage:**
```js
router.get("/me", authenticate, authController.getMe);
// Any future protected route:
router.get("/settings", authenticate, settingsController.get);
```

#### `validate.js`

A middleware factory that takes a Zod schema and returns a middleware. The middleware calls `schema.safeParse(req.body)` and either returns a 400 with the first validation error, or calls `next()` to proceed.

**Usage:**
```js
router.post("/register", validate(RegisterSchema), authController.registerUser);
```

---

### Validators layer

**File:** [`src/Validators/auth.validator.js`](./src/Validators/auth.validator.js)

Contains three Zod schemas. Schemas live in a dedicated folder (not inside controllers) so they can be reused across routes and tested in isolation.

---

### Controllers layer

**File:** [`src/controllers/auth.controller.js`](./src/controllers/auth.controller.js)

Contains all business logic as named exports. Each export is an async arrow function passed to Express. Because Express 5 is used, async rejections automatically flow to the global error handler.

| Export | Route | What it does |
|---|---|---|
| `registerUser` | `POST /register` | Validates uniqueness, hashes password, creates user + OTP doc, sends verification email |
| `login` | `POST /login` | Checks credentials, issues access + refresh tokens, creates session record |
| `getMe` | `GET /me` | Returns the authenticated user's profile (relies entirely on `req.user` from `authenticate` middleware) |
| `refreshToken` | `POST /refresh-token` | Validates refresh cookie against DB session, issues new token pair (rotation) |
| `logout` | `POST /logout` | Revokes the current session, clears the cookie |
| `logoutAll` | `POST /logout-all` | Revokes ALL sessions for the user, clears the cookie |
| `verifyEmail` | `POST /verify-email` | Checks submitted OTP hash against stored hash, marks user as verified |

**Token rotation pattern (in `refreshToken`):**  
On every refresh the old `refreshTokenHash` in the session is replaced with the new token's hash. This means each refresh token can only be used once — a stolen token becomes invalid as soon as the legitimate user refreshes.

---

### Services layer

**File:** [`src/services/email.service.js`](./src/services/email.service.js)

A single exported function `sendEmail(to, subject, text, html)` that wraps Nodemailer. The transporter is created once at module load (not per-request) for efficiency.

---

### Utils layer

**File:** [`src/utils/utils.js`](./src/utils/utils.js)

| Export | What it does |
|---|---|
| `generateOtp()` | Returns a 6-digit CSPRNG integer as a string using `crypto.randomInt` |
| `getOtpHtml(otp)` | Returns a complete HTML email template string with the OTP embedded |

---

### Routes layer

**File:** [`src/routes/auth.routes.js`](./src/routes/auth.routes.js)

Uses `express.Router()` to declare all auth routes. The router is mounted at `/api/auth` in `app.js`. Route declarations follow the pattern:

```
router.METHOD("/path", [validate(Schema)?], [authenticate?], controller.handler)
```

Left-to-right: input validation runs first, then auth check, then business logic. This order ensures controllers never receive invalid or unauthenticated input.

---

## 7 · Security Patterns & Design Decisions

| Pattern | Where | Why |
|---|---|---|
| **bcrypt for passwords** | `registerUser`, `login` | Adaptive slow hash prevents brute-force attacks; salted automatically |
| **JWT access tokens (15 min)** | `login`, `refreshToken`, `authenticate` | Short lifetime limits damage if a token is stolen |
| **Refresh tokens in httpOnly cookies (7 days)** | `login`, `refreshToken`, `logout` | httpOnly + secure + sameSite blocks XSS and CSRF theft of long-lived tokens |
| **SHA-256 hash of refresh token stored in DB** | `sessionModel` | Raw token only lives in the cookie. DB breach doesn't expose usable tokens |
| **SHA-256 hash of OTP stored in DB** | `otpModel` | Raw OTP only sent in the email. DB breach doesn't expose usable codes |
| **`crypto.randomInt` for OTP** | `utils.js` | CSPRNG — unpredictable and uniform, unlike `Math.random()` |
| **Email verification gate on login** | `login` controller | Prevents use of accounts with unverified/attacker-owned emails |
| **Session DB check on refresh** | `refreshToken` controller | Allows server-side revocation of refresh tokens even before they expire |
| **Refresh token rotation** | `refreshToken` controller | Each token is single-use; replaces old hash in session, invalidating the previous token |
| **`logoutAll` bulk revocation** | `logoutAll` controller | Users can invalidate all sessions from all devices at once |
| **`.select("-password")` in authenticate** | `authenticate.js` | Password hash is never attached to `req.user`, preventing accidental leakage |
| **Global 404 handler** | `app.js` | Every unmatched path returns structured JSON instead of an HTML error page |
| **Global error handler (4-arg)** | `app.js` | All async failures produce a safe `{ error, message }` JSON 500 instead of a crash or HTML stack trace |
| **Fail-fast config validation** | `config.js` | Missing env vars crash the process at startup, not silently at runtime |

---

## 8 · Environment Variables

Defined in [`.env.example`](./.env.example). Copy to `.env` and fill in real values.

| Variable | Required | Where used | Description |
|---|---|---|---|
| `PORT` | No (default 3000) | `server.js` | Port the server listens on |
| `MONGO_URL` | ✅ Yes | `config.js` → `database.js` | MongoDB Atlas (or local) connection string |
| `JWT_SECRET` | ✅ Yes | `config.js` → `auth.controller.js`, `authenticate.js` | Secret used to sign and verify all JWTs. Must be ≥ 32 random characters |
| `GOOGLE_CLIENT_ID` | ✅ Yes (non-CI) | `config.js` → `email.service.js` | OAuth2 client ID for Gmail sending |
| `GOOGLE_CLIENT_SECRET` | ✅ Yes (non-CI) | `config.js` → `email.service.js` | OAuth2 client secret |
| `GOOGLE_REFRESH_TOKEN` | ✅ Yes (non-CI) | `config.js` → `email.service.js` | OAuth2 refresh token that the email service uses to obtain short-lived access tokens |
| `GOOGLE_USER` | ✅ Yes (non-CI) | `config.js` → `email.service.js` | Gmail address used as the sender |
| `NODE_ENV` | No (default `development`) | `config.js` | Set to `ci` or `test` to skip email config validation in CI |

---

## 9 · npm Scripts

| Script | Command | When to use |
|---|---|---|
| `npm start` | `node server.js` | Production — starts the server without file watching |
| `npm run dev` | `npx nodemon server.js` | Local development — auto-restarts on file changes |
| `npm run lint` | `eslint .` | Check for lint errors without fixing |
| `npm run lint:fix` | `eslint . --fix` | Auto-fix all fixable lint errors |
| `npm test` | *(not yet configured)* | Placeholder — no tests exist yet (audit finding F-39) |

---

## 10 · CI/CD Pipeline

**File:** [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)  
**Trigger:** Every push and pull request to `main`

| Job | Depends on | What it does |
|---|---|---|
| `lint` | — | Runs `npm run lint`; fails the pipeline if any ESLint error is found |
| `health-check` | `lint` | Spins up a local MongoDB 7 service container, starts the server in CI mode, waits for it to be ready, hits `GET /health`, asserts `status === "ok"` |
| `docker-build` | `lint` | Builds the Docker image with the commit SHA as the tag, verifies the image exists |
| `deploy` | *(commented out)* | Placeholder for Railway / Render / VPS deployment — to be enabled when a target is chosen |

---

## 11 · Docker Setup

**File:** [`Dockerfile`](./Dockerfile)

Uses a **multi-stage build** for a lean, secure production image:

```
Stage 1 (deps)
  FROM node:20-alpine
  npm ci --omit=dev        ← install only production deps

Stage 2 (production)
  FROM node:20-alpine
  addgroup/adduser         ← create non-root user
  COPY --from=deps         ← copy only the installed node_modules
  COPY src/ server.js      ← copy only source files (no .env, no tests)
  USER appuser             ← run as non-root
  EXPOSE 3000
  CMD ["node", "server.js"]
```

**Why multi-stage:**  
The final image contains no build tools, no dev dependencies, and no source files other than what the app needs to run. This reduces the attack surface and image size.

**`.dockerignore`** excludes: `node_modules`, `.env*`, `.git`, `build`, `*.log`, `*.md`

---

## 12 · Changelog

> Add an entry here every time you make a notable change to the stack.

| Date | Change | Reason |
|---|---|---|
| 2026-09-19 | Added `authenticate` middleware (`src/middlewares/authenticate.js`) | Extract JWT verification from `getMe` controller into a reusable middleware; prevents code duplication on future protected routes |
| 2026-09-19 | Renamed `GET /api/auth/get-me` → `GET /api/auth/me` | REST convention: HTTP verb (GET) already expresses the action; path should be a noun |
| 2026-09-19 | Added global 404 catch-all handler in `app.js` | Unmatched routes previously returned an HTML error page breaking the JSON API contract |
| 2026-09-19 | Added global 4-argument error handler in `app.js` | Express 5 forwards async rejections here; without this, errors produce HTML or crash the process |
| 2026-09-19 | Added Zod validation middleware + schemas (previous session) | Input from clients is never trusted; Zod provides typed, declarative validation with clear error messages |
