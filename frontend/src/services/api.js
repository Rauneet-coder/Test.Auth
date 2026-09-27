import axios from "axios";

// Keep the access token in memory. The browser manages the HttpOnly refresh cookie.
let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token;
};
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
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
export const authApi = {
  register: (payload) => api.post("/api/auth/register", payload),
  login: (payload) => api.post("/api/auth/login", payload),
  verifyEmail: (payload) => api.post("/api/auth/verify-email", payload),
  refreshToken: () => api.post("/api/auth/refresh-token"),
  logout: () => api.post("/api/auth/logout"),
  logoutAll: () => api.post("/api/auth/logout-all"),
  getMe: () => api.get("/api/auth/me"),
};
export default api;
