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
api.interceptors.response.use(
  (response) => {
    if (!response.data || typeof response.data !== "object") {
      const error = new Error(
        "Expected a JSON response. Check that the Aith backend is running on port 3000.",
      );
      error.response = {
        status: response.status,
        data: { message: error.message },
      };
      return Promise.reject(error);
    }
    return response;
  },
  (error) => {
    if (error.response && typeof error.response.data !== "object") {
      error.response.data = {
        message:
          "Expected a JSON response. Check that the Aith backend is running on port 3000.",
      };
    }
    error.message =
      error.response?.data?.errors?.map((item) => item.message).join(" ") ||
      error.response?.data?.message ||
      (error.response
        ? `Request failed (${error.response.status}).`
        : "Could not reach the API. Check that your backend is running on port 3000.");
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
