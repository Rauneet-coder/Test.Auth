# Test.Auth

Authentication service built with Node.js, Express, MongoDB, and JSON Web Tokens.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose
- **Authentication:** JWT (jsonwebtoken) & bcrypt
- **Development:** Nodemon, Morgan

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Rauneet-coder/Test.Auth.git
cd Test.Auth
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Set the following variables in `.env`:
- `PORT` (default: 3000)
- `MONGO_URL` (your MongoDB connection string)
- `JWT_SECRET` (secret key for signing auth tokens)

### 4. Run the server
```bash
npm run dev
```

## API Endpoints

All endpoints are mounted under `/api/auth` and protected by rate limiting.

### 1. User Registration
`POST /api/auth/register`
- **Body**: `{ "username": "string", "email": "string", "password": "string" }`
- **Success (201)**: `{ "message": "User registered successfully", "user": { "username", "email", "verified": false } }`
- **Features**: Database-level unique constraint handling, automatic rollback on email failure, and unverified account registration recovery.

### 2. Verify Email
`POST /api/auth/verify-email`
- **Body**: `{ "email": "string", "otp": "string" }`
- **Success (200)**: `{ "message": "Email verified successfully", "user": { "username", "email", "verified": true } }`
- **Features**: Failed attempt tracking, 5-attempt limit, and automatic lockout/expiry handling.

### 3. Resend Verification Code
`POST /api/auth/resend-otp` (alias: `/api/auth/resend-verification`)
- **Body**: `{ "email": "string" }`
- **Success (200)**: `{ "message": "Verification code sent successfully" }`
- **Features**: Replaces stale OTPs with a newly generated cryptographically secure code.

### 4. User Login
`POST /api/auth/login`
- **Body**: `{ "email": "string", "password": "string" }`
- **Success (200)**: Sets `refreshToken` HTTP-only cookie and returns `{ "message": "User logged in successfully", "user": { "username": "string", "email": "string" }, "accessToken": "<jwt>" }`.
- **Features**: Prevents account enumeration by returning generic error messages on credential failure.

### 5. Get Profile
`GET /api/auth/me`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Success (200)**: `{ "message": "User found", "user": { "username", "email" } }`
- **Features**: Strict `tokenUse: "access"` claim verification.

### 6. Refresh Token
`POST /api/auth/refresh-token`
- **Cookie**: `refreshToken=<cookie>`
- **Success (200)**: Atomically rotates the refresh token cookie and issues a new access token `{ "message": "Access token refreshed successfully", "accessToken": "<jwt>" }`.
- **Features**: Atomic conditional database update preventing race conditions and token reuse.

### 7. Logout (Single Device)
`POST /api/auth/logout`
- **Cookie**: `refreshToken=<cookie>`
- **Success (200)**: Atomically revokes current session and clears cookie.

### 8. Logout All Devices
`POST /api/auth/logout-all`
- **Cookie**: `refreshToken=<cookie>`
- **Success (200)**: Revokes all active sessions for the authenticated user and clears cookie.

### 9. Health Checks
- `GET /health`: Top-level health probe returning `{ "status": "ok", "uptime": number, "timestamp": string }` for container orchestrators and CI/CD pipelines.
- `GET /api/auth/health-check`: Auth router route probe returning `{ "message": "OK" }`.

---

## Security Documentation

See [auth-security.md](../docs/auth-security.md) for full details on:
- Atomic refresh-token rotation
- OTP attempt limits and lockout handling
- Strict JWT claim enforcement (`tokenUse`)
- Cryptographic OTP generation boundaries (`crypto.randomInt`)
- Email failure propagation and registration recovery flow
- Database-level unique constraint enforcement
