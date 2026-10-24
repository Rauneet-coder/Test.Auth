/** The playground intentionally exposes only the backend's seven auth routes. */
export const AUTH_ACTIONS = Object.freeze({
  login: { method: "POST", path: "/api/auth/login" },
  register: { method: "POST", path: "/api/auth/register" },
  verifyEmail: { method: "POST", path: "/api/auth/verify-email" },
  refreshToken: { method: "POST", path: "/api/auth/refresh-token" },
  logout: { method: "POST", path: "/api/auth/logout" },
  logoutAll: { method: "POST", path: "/api/auth/logout-all" },
  getMe: { method: "GET", path: "/api/auth/me" },
});

export function getAction(action) {
  if (!Object.hasOwn(AUTH_ACTIONS, action)) {
    throw new Error("Choose a supported authentication action.");
  }
  return AUTH_ACTIONS[action];
}

export function modeFromPath(pathname) {
  if (pathname === "/register" || pathname === "/register/") return "register";
  if (pathname === "/verify" || pathname === "/verify/") return "verify";
  return "login";
}

export function pathFromMode(mode) {
  return mode === "register" ? "/register" : mode === "verify" ? "/verify" : "/login";
}

/** Project fields explicitly so UI state and unrelated secrets never reach the API. */
export function payloadForAction(action, fields = {}) {
  getAction(action);
  const email = typeof fields.email === "string" ? fields.email.trim() : "";
  const password = typeof fields.password === "string" ? fields.password : "";
  if (action === "register") {
    const username = typeof fields.username === "string" ? fields.username.trim() : "";
    return { username, email, password };
  }
  if (action === "login") return { email, password };
  if (action === "verifyEmail") {
    return { email, otp: typeof fields.otp === "string" ? fields.otp : "" };
  }
  return undefined;
}

const sensitiveKey = /token|password|passwd|secret|authorization|cookie|otp|verification.?code/i;
const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

/** Return a display-safe copy; the original response remains available to auth logic. */
export function redactData(data) {
  const seen = new WeakSet();
  function visit(value, depth) {
    if (typeof value === "string") return value.replace(jwtPattern, "[hidden]");
    if (value === null || typeof value !== "object") return value;
    if (seen.has(value)) return "[circular]";
    if (depth > 20) return "[nested output omitted]";
    seen.add(value);
    if (Array.isArray(value)) return value.map((item) => visit(item, depth + 1));
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key, sensitiveKey.test(key) ? "[hidden]" : visit(item, depth + 1),
    ]));
  }
  return visit(data, 0);
}

let entrySequence = 0;
export function createActivityEntry(action, status, duration, data, now = new Date()) {
  const { method, path } = getAction(action);
  return {
    id: `${now.getTime()}-${++entrySequence}`,
    action, method, path, status,
    duration: Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0,
    data: redactData(data),
    time: now.toISOString(),
  };
}

export function appendActivity(history, entry) {
  return [entry, ...history].slice(0, 50);
}

export function formAfterSuccess(action, fields, data) {
  if (action === "register") {
    return { ...fields, email: data.user.email, password: "", otp: "" };
  }
  return fields;
}
