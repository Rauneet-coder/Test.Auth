/**
 * api.js — Axios instance pre-configured for the Aith backend.
 *
 * All auth endpoints live at /api/auth/*. The base URL is read from
 * the Vite env variable VITE_API_URL, falling back to the local dev server.
 *
 * Credentials (cookies) are included so the httpOnly refresh-token cookie
 * is sent automatically on every request.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,          // include httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

/* ---------- Request interceptor — attach access token ---------- */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---------- Response interceptor — surface error messages ---------- */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  },
);

/* ---------- Auth endpoints ---------- */
export const authApi = {
  register: (payload) => api.post('/api/auth/register', payload),
  login:    (payload) => api.post('/api/auth/login', payload),
  verifyEmail: (payload) => api.post('/api/auth/verify-email', payload),
  refreshToken: () => api.post('/api/auth/refresh-token'),
  logout:    () => api.post('/api/auth/logout'),
  logoutAll: () => api.post('/api/auth/logout-all'),
  getMe:     () => api.get('/api/auth/me'),
};

export default api;
