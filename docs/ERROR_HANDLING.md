# API Error Handling and Correlation Architecture

This document describes the standardized error handling and request correlation architecture for `Test.Auth`.

## 1. Standard Error Response Contract

All error responses across the API adhere to the following contract:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Safe human-readable message",
    "details": [
      {
        "field": "fieldName",
        "message": "Specific error description"
      }
    ],
    "requestId": "correlation-uuid"
  }
}
```

### Key Contract Guarantees
- `success`: Always `false` on error responses.
- `error.code`: Stable, uppercase machine-readable string identifier.
- `error.message`: Human-readable, safe public message suitable for API consumers.
- `error.details`: Optional array of field-level validation errors.
- `error.requestId`: Correlation identifier attached to the request for traceability.
- **Security:** Stack traces, internal database strings, JWT secrets, and provider credentials are strictly redacted from HTTP responses.

---

## 2. Request Correlation (`requestId`)

Every HTTP request is assigned a correlation ID by `requestId` middleware:
1. Validates incoming `X-Request-Id` request header (up to 128 alphanumeric/hyphen characters).
2. If absent or invalid, generates a UUIDv4 via Node.js built-in `crypto.randomUUID()`.
3. Attaches the ID to `req.id`.
4. Sets the `X-Request-Id` response header on all outgoing responses.
5. Injects `requestId` into the JSON error body.
6. Prefixes all server-side operational and unexpected error logs with `[requestId]`.

---

## 3. Standard Error Code Registry

| Error Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | `400` | Schema or field validation failure (Zod / Mongoose) |
| `INVALID_REQUEST_BODY` | `400` | Malformed or invalid JSON body |
| `INVALID_CREDENTIALS` | `400` | Incorrect email or password during login |
| `EMAIL_NOT_VERIFIED` | `400` | User account has not completed OTP email verification |
| `INVALID_OTP` | `400` | Invalid verification code supplied |
| `OTP_EXPIRED` | `400` | Verification code expired or attempt limit reached |
| `AUTHENTICATION_REQUIRED` | `401` | Bearer access token missing or user account removed |
| `INVALID_ACCESS_TOKEN` | `401` | Access token expired, forged, or claim mismatch |
| `INVALID_REFRESH_TOKEN` | `401` | Refresh token cookie missing, expired, or session revoked |
| `ORIGIN_NOT_ALLOWED` | `403` | Origin rejected by CORS policy |
| `RESOURCE_NOT_FOUND` | `404` | Target user, OTP, or database resource does not exist |
| `ROUTE_NOT_FOUND` | `404` | Unmatched API path (404 catch-all) |
| `RESOURCE_CONFLICT` | `409` | Duplicate user registration or email collision |
| `PAYLOAD_TOO_LARGE` | `413` | Request body exceeds configured size limit (10kb) |
| `RATE_LIMIT_EXCEEDED` | `429` | Request exceeded rate limiter or cooldown window |
| `INTERNAL_SERVER_ERROR` | `500` | Unexpected server failure or infrastructure outage |

---

## 4. Architecture Implementation

### `AppError` (`backend/src/errors/AppError.js`)
Application errors extend the built-in `Error` class and define `isOperational = true`. Static factory methods provide convenient, standardized instantiation across controllers.

### `errorHandler` (`backend/src/middlewares/errorHandler.js`)
Express 5 centralized error middleware that intercepts all operational errors, schema rejections, body parser syntax errors, CORS rejections, MongoDB duplicate keys, and unexpected server failures.
