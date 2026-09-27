# Aith authentication playground

A single-page React interface for the existing Express authentication backend.

## Run locally

Start the configured backend on port 3000, then:

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` requests to http://localhost:3000, so no cross-origin setup is needed in development. MongoDB and the backend's email configuration must be working for registration and email verification.

## Try the flow

1. Create an account with a username, email, and password.
2. Enter the six-digit code delivered by email.
3. Sign in, then use Get profile, Refresh token, Sign out, or All devices.
4. Inspect status codes, timings, response JSON, and the five most recent requests. Requests can also be tested while signed out.

Access tokens stay in memory and are hidden in displayed responses. After a page reload, use Refresh token followed by Get profile to restore the session using the backend's HttpOnly cookie. Request activity is cleared on reload. Google and GitHub buttons are disabled placeholders for future OAuth support.

The backend sets Secure, SameSite=Strict refresh cookies. Use localhost for local development, and HTTPS with the API on the same site when deploying. The production web server must forward `/api` to the backend. If using `VITE_API_URL` for a separate API origin, configure the backend's CORS and cookie policy accordingly.

```sh
npm run build
npm run lint
```
