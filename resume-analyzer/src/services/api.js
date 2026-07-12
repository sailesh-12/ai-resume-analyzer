/**
 * services/api.js
 * The ONE and ONLY axios instance for the entire app.
 *
 * Responsibilities:
 *  - Sets base URL from env variable (falls back to localhost)
 *  - Attaches the JWT Authorization header automatically on every request
 *  - Handles 401 Unauthorized globally — clears token and redirects to /login
 *  - Sets a sensible default timeout
 *
 * Usage:
 *   import api from '@/services/api';
 *   const { data } = await api.post('/rag-query', formData);
 */
import axios from 'axios';
import { ROUTES } from '../constants/routes';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: 120_000, // 2 minutes — long-running AI analysis
});

// ─── Request Interceptor ────────────────────────────────────────────────────
// Automatically attach the JWT token to every outgoing request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ───────────────────────────────────────────────────
// Handle common HTTP errors in one place instead of in every component.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clean up and force re-login
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      window.location.href = ROUTES.LOGIN;
    }
    return Promise.reject(error);
  }
);

export default api;
