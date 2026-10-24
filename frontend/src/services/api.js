import axios from "axios";
import { getAction } from "../lib/workspace.js";

// Keep the access token in memory. The browser manages the HttpOnly refresh cookie.
let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token;
};
const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || "",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
export function retryDelaySeconds(value, now = Date.now()) {
  if (value === undefined || value === null || value === "") return null;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds : (Date.parse(value) - now) / 1000;
  return Number.isFinite(delay) && delay >= 0 ? Math.ceil(delay) : null;
}

export function describeRequestError(error, { online = true } = {}) {
  const status = error?.response?.status;
  const body = error?.response?.data;
  const isRecord = body && typeof body === "object" && !Array.isArray(body);
  const issues = Array.isArray(body?.errors)
    ? body.errors.filter((item) => typeof item?.message === "string").map((item) => item.message).join(" ")
    : "";
  let kind = "server";
  let message = issues || (isRecord && typeof body.message === "string" ? body.message : "");
  if (error?.code === "INVALID_RESPONSE") {
    kind = "invalid-response";
    message = error.message;
  } else if (!online) {
    kind = "offline";
    message = "You are offline. Reconnect, then try your request again.";
  } else if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
    kind = "timeout";
    message = "The request took too long. Check your connection and try again.";
  } else if (error?.code === "ERR_CANCELED") {
    kind = "cancelled";
    message = "The request was cancelled.";
  } else if (status === 429) {
    kind = "rate-limit";
    const retryAfter = retryDelaySeconds(error.response?.headers?.["retry-after"]);
    message = retryAfter === null
      ? "Too many attempts. Wait a moment before trying again."
      : `Too many attempts. Try again in ${retryAfter} seconds.`;
  } else if (!status) {
    kind = "connection";
    message = "Could not reach the API. Check the backend connection and try again.";
  } else if (!message) {
    message = `Request failed (${status}). Please try again.`;
  }
  return { kind, message, status: status || "ERR" };
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const details = describeRequestError(error, { online: globalThis.navigator?.onLine !== false });
    error.message = details.message;
    return Promise.reject(error);
  },
);

export function assertAuthResponse(action, response) {
  getAction(action);
  const data = response?.data;
  const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const text = (value) => typeof value === "string" && value.trim().length > 0;
  const needsUser = ["login", "getMe", "register", "verifyEmail"].includes(action);
  const needsToken = ["login", "refreshToken"].includes(action);
  if (!record(data) || !text(data.message) ||
      (needsUser && (!record(data.user) || !text(data.user.username) || !text(data.user.email))) ||
      (needsToken && !text(data.accessToken))) {
    const error = new Error("The API returned an incomplete response. Check the backend connection and try again.");
    error.code = "INVALID_RESPONSE";
    error.response = { status: response?.status, data: { message: error.message } };
    throw error;
  }
  return response;
}

const request = async (action, operation) => assertAuthResponse(action, await operation());

export const authApi = {
  register: (payload) => request("register", () => api.post("/api/auth/register", payload)),
  login: (payload) => request("login", () => api.post("/api/auth/login", payload)),
  verifyEmail: (payload) => request("verifyEmail", () => api.post("/api/auth/verify-email", payload)),
  refreshToken: () => request("refreshToken", () => api.post("/api/auth/refresh-token")),
  logout: () => request("logout", () => api.post("/api/auth/logout")),
  logoutAll: () => request("logoutAll", () => api.post("/api/auth/logout-all")),
  getMe: () => request("getMe", () => api.get("/api/auth/me")),
};
export default api;
