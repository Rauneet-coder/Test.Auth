# Authentication & Security Architecture

This document describes the security guarantees, threat models, and architectural patterns implemented in the authentication service.

---

## 1. Refresh Token Rotation & Session Management

### Threat Model
Refresh token theft or race conditions where multiple requests using the same refresh token could lead to duplicate active sessions or replay attacks.

### Atomic Conditional Rotation
Instead of a two-step `findOne` followed by an asynchronous `save()`, refresh token rotation uses a single atomic MongoDB conditional update:

```javascript
const session = await sessionModel.findOneAndUpdate(
    {
        refreshTokenHash: oldRefreshTokenHash,
        revoked: false
    },
    {
        $set: { refreshTokenHash: newRefreshTokenHash }
    },
    { returnDocument: "after" }
);
```

- **Concurrency Protection**: If multiple simultaneous refresh requests arrive with the same token, MongoDB guarantees that exactly one update succeeds. Concurrent requests find no matching document and receive a `401 Unauthorized` response.
- **Revocation**: The `/api/auth/logout` endpoint atomically revokes the session with `{ $set: { revoked: true } }`.
- **All Devices Signout**: The `/api/auth/logout-all` endpoint marks all active sessions for the user as revoked (`revoked: true`).

---

## 2. One-Time Password (OTP) Verification & Brute-Force Protection

### Threat Model
An attacker attempts to brute-force 6-digit numeric OTP verification codes before they expire.

### Attempt Limiting & Lockout
The OTP model tracks failed verification attempts:

- **Schema Fields**:
  - `failedAttempts`: Current number of consecutive incorrect attempts (default: 0).
  - `maxAttempts`: Maximum allowed attempts before lockout (default: 5).
  - `deletedAt`: Expiry timestamp with TTL index.
- **Atomic Failure Tracking**:
  ```javascript
  const updatedDoc = await otpModel.findOneAndUpdate(
      { _id: otpDoc._id },
      { $inc: { failedAttempts: 1 } },
      { returnDocument: "after" }
  );
  ```
- **Lockout Enforcement**: Once `failedAttempts >= maxAttempts`, the OTP document is deleted/invalidated immediately, returning `400 Too many failed attempts. OTP has expired.` Subsequent attempts (even with the correct code) are rejected.

---

## 3. Strict JWT Claim Enforcement (`tokenUse`)

### Threat Model
Cross-endpoint token confusion attacks (e.g. attempting to use a refresh token as an access token to call `/api/auth/me`, or using an access token against `/api/auth/refresh-token`).

### Exact Claim Matching
Every token issuance explicitly sets the `tokenUse` claim:
- Access tokens: `tokenUse: "access"`
- Refresh tokens: `tokenUse: "refresh"`

Verification checks require strict equality without bypass:
- `authenticate` middleware rejects any token where `decoded.tokenUse !== "access"`.
- `refreshToken`, `logout`, and `logoutAll` handlers reject any token where `decoded.tokenUse !== "refresh"`.

---

## 4. Cryptographic OTP Generation Boundaries

### Implementation
Node.js `crypto.randomInt(min, max)` excludes the `max` boundary ($min \le n < max$).

The OTP generator uses:
```javascript
export function generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}
```
This guarantees all 900,000 possible 6-digit values from `100000` through `999999` inclusive can be produced uniformly.

---

## 5. Email Dispatch Error Handling & Registration Rollback

### Threat Model
External email delivery failures (e.g., SMTP transport errors) leaving orphan unverified user accounts or swallowing errors so users believe registration succeeded when no code was sent.

### Failure Propagation & Rollback
1. `sendEmail` re-throws errors on transport failure instead of swallowing them.
2. In `registerUser`, if email sending fails for a newly created user:
   - The created OTP is deleted.
   - The unverified user record is rolled back (`Usermodel.deleteOne({ _id: user._id })`).
   - A `500 Failed to send verification email` response is returned.
3. No zombie unverified accounts remain in the database upon transport failure.

---

## 6. Registration Recovery Flow & Database Uniqueness

### Database Uniqueness
- Unique indexes on `username` and `email` are enforced at the database level (`autoIndex: true`).
- Duplicate key errors (`error.code === 11000`) are handled gracefully and return `409 User already exists`.

### Registration Recovery Flow
When a user attempts to register with an existing unverified account:
1. Registration recovery allows the user to re-register with updated credentials.
2. The user's password is updated and re-hashed.
3. Stale OTPs are purged, and a fresh OTP is generated and emailed.

### Resend Verification Flow
Dedicated endpoint `POST /api/auth/resend-otp` (and `/api/auth/resend-verification`):
1. Validates the email address.
2. Verifies the user exists and is currently unverified (`verified: false`).
3. Invalidates all previous OTPs for that email.
4. Issues a fresh 6-digit OTP and dispatches a new verification email.
