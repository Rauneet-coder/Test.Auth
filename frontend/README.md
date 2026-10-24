# Aith authentication playground

A React workspace for the existing Express authentication backend. The design adapts the split-panel layout of the free [shadcn/ui authentication blocks](https://ui.shadcn.com/blocks/authentication) to Aith's forest-green identity.

## Run locally

Use Node.js 24 (the version used by frontend CI). Start the configured backend on port 3000, then:

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` requests to http://localhost:3000. MongoDB and the backend's email configuration must work for registration and verification.

## Explore the workspace

1. Create an account with a username, email, and password. The form explains each password requirement and shows local and server validation errors beside the affected fields.
2. Enter the six-digit email code within five minutes. Paste a full code, or use the arrow keys, Home, and End to select a digit for correction.
3. Sign in, then try Get profile, Refresh token, Sign out, and All devices. The all-devices action asks for confirmation.
4. Inspect status codes, timings, and redacted JSON. Copy or download a response, select earlier requests, or search and filter the 50 most recent requests from this visit.
5. Open API reference for the seven supported routes, request examples, and a link back to the matching form.

Direct form routes are `/login`, `/register`, and `/verify`. Add `#activity` or `#guide` to open another workspace view. Browser Back and Forward restore the corresponding view. The quick start guide is available from the sidebar and header; press `?` outside a field to open it. `Alt+1`, `Alt+2`, and `Alt+3` switch workspace views.

Access tokens stay in memory, and credentials are hidden in response output. After a reload, use Refresh token to rotate the browser's HttpOnly refresh cookie and automatically load the profile. The app does not make authentication requests automatically on mount. Activity is cleared on reload; only the sidebar layout preference is stored locally.

Google/GitHub sign-in, password resets, and verification-code resending are unavailable because the backend has no corresponding endpoints.

## Check changes

```sh
npm test
npm run lint
npm run build
```

Tests cover validation, request contracts, credential redaction, session orchestration, routing, history filtering, and safe response export. Frontend CI runs all three checks for pull requests and pushes to main.

## Deployment requirements

The backend uses Secure, SameSite=Strict refresh cookies. Use localhost for local development and same-site HTTPS in production. The production server must forward `/api` to the backend and serve `index.html` for frontend routes. If `VITE_API_URL` points to another origin, configure backend CORS and cookie policy for that deployment.

The frontend build does not deploy the Express service, provision MongoDB, or configure email delivery. See [verification notes](../docs/ux-verification.md) for the checks completed during the redesign.
