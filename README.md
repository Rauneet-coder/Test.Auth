# Test.Auth

A full-stack authentication platform featuring an Express 5 (Node.js ESM) backend and a React 19 (Vite) frontend with MongoDB, JWT, bcrypt, and HttpOnly session cookies.

---

## Repository Structure

```text
Test.Auth/
├── backend/            # Express 5 (ESM) REST API service
│   ├── src/            # Controllers, models, routes, middlewares, services, validators
│   ├── test/           # Vitest integration & unit test suite (in-memory MongoDB)
│   ├── Dockerfile      # Multi-stage production container definition
│   └── package.json    # Backend dependencies & npm scripts
├── frontend/           # React 19 + Vite SPA authentication playground
│   ├── src/            # Auth forms, state inspector, session manager, API guide
│   ├── test/           # Native Node.js contract and unit test suite
│   ├── Dockerfile      # Multi-stage static build with Nginx
│   └── package.json    # Frontend dependencies & npm scripts
├── docs/               # Architecture, security threat models, and audit reports
│   ├── PHASE_0_AUDIT.md        # Comprehensive Phase 0 audit report
│   ├── PHASE_0_REMEDIATION.md  # Detailed remediation plan & task backlog
│   └── auth-security.md        # Concurrency & security architecture
└── .github/workflows/  # GitHub Actions CI/CD workflows for backend and frontend
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js ≥ 20.0.0
- npm ≥ 10.0.0
- MongoDB instance (local or MongoDB Atlas connection string)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Configure `.env` with:
- `PORT` (default: 3000)
- `MONGO_URL` (MongoDB connection URI)
- `JWT_SECRET` (secret key for signing auth tokens)
- Google OAuth credentials (optional for testing, required for real email dispatch)

Start the backend development server:
```bash
npm run dev
```

### 2. Frontend Setup

In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` requests directly to `http://localhost:3000`.

---

## Running Verification & Tests

### Backend Tests (Vitest + In-Memory MongoDB)
```bash
cd backend
npm run lint         # ESLint checks
npm run test-run     # Vitest integration and unit tests (single-run mode)
```

### Frontend Tests (Node.js Native Runner & Oxlint)
```bash
cd frontend
npm run lint         # Oxlint checks
npm test             # Native Node test suite (contracts, forms, redaction)
npm run build        # Production Vite build
```

---

## Security & Architecture Highlights

- **Atomic Refresh Token Rotation:** Single-operation conditional update prevents race conditions and token reuse.
- **Strict JWT Claim Enforcement:** Explicit `tokenUse: "access"` and `tokenUse: "refresh"` claim validation across endpoints.
- **CSPRNG OTP Generation:** 6-digit verification codes generated with `crypto.randomInt()`.
- **Brute-Force & Attempt Tracking:** Verification locks out after 5 consecutive incorrect attempts.
- **Security Headers & CORS:** Protected by `helmet` and configurable origin-restricted `cors`.
- **Account Enumeration Defense:** Generic credentials failure messaging on login.
- **Registration Rollback:** Automatic cleanup of orphan records on email dispatch failure.

See [docs/PHASE_0_AUDIT.md](./docs/PHASE_0_AUDIT.md) and [docs/auth-security.md](./docs/auth-security.md) for full architectural specifications.

