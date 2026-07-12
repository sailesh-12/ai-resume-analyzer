/**
 * services/authService.js
 * All authentication API calls in one place.
 */
import api from './api';
import { ENDPOINTS } from '../constants/apiEndpoints';

/**
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ access_token: string }>}
 */
export async function login({ email, password }) {
  const { data } = await api.post(ENDPOINTS.LOGIN, { email, password });
  return data;
}

/**
 * @param {{ email: string, password: string, name?: string }} payload
 * @returns {Promise<any>}
 */
export async function signup(payload) {
  const { data } = await api.post(ENDPOINTS.SIGNUP, payload);
  return data;
}
