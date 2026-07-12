/**
 * services/analysisService.js
 * All resume analysis API calls in one place.
 * Components and hooks import these named functions — never raw axios calls.
 *
 * Error handling:
 *  - All functions throw on failure — the caller (hook/component) handles UI state.
 *  - Rate-limit (429) detail is preserved in the thrown error for caller to display.
 */
import api from './api';
import { ENDPOINTS } from '../constants/apiEndpoints';

/**
 * Sends the PDF file for full RAG-based analysis.
 * @param {File} file - The PDF resume file
 * @returns {Promise<{ answer: string, score?: number, insights?: object }>}
 */
export async function analyzeResume(file) {
  const form = new FormData();
  form.append('file', file);

  const { data } = await api.post(ENDPOINTS.ANALYZE, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

/**
 * Fetches the numeric score breakdown per category.
 * @param {File} file
 * @returns {Promise<{ overall: number, breakdown: object, details: string }>}
 */
export async function getScoreBreakdown(file) {
  const form = new FormData();
  form.append('file', file);

  const { data } = await api.post(ENDPOINTS.SCORE_BREAKDOWN, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

/**
 * Fetches improvement suggestions for the resume.
 * @param {File} file
 * @returns {Promise<{ improvements: string | string[] }>}
 */
export async function getImprovements(file) {
  const form = new FormData();
  form.append('file', file);

  const { data } = await api.post(ENDPOINTS.IMPROVEMENTS, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

/**
 * Fetches strengths identified in the resume.
 * @param {File} file
 * @returns {Promise<{ strengths: string | string[] }>}
 */
export async function getStrengths(file) {
  const form = new FormData();
  form.append('file', file);

  const { data } = await api.post(ENDPOINTS.STRENGTHS, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

/**
 * Fetches radar analysis (6-dimensional).
 * @param {File} file
 * @returns {Promise<{ communication, technical, experience, ats, achievement, presentation }>}
 */
export async function getRadarAnalysis(file) {
  const form = new FormData();
  form.append('file', file);

  const { data } = await api.post(ENDPOINTS.RADAR, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

/**
 * Normalizes the error from an axios rejection into a human-readable string.
 * Handles the backend's 429 rate-limit detail format.
 * @param {unknown} err
 * @returns {string}
 */
export function extractErrorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (err?.response?.status === 429 && detail?.message) {
    return `⏳ ${detail.message}`;
  }
  return (
    detail?.message ||
    detail?.error ||
    err?.response?.data?.error ||
    err?.message ||
    'Analysis failed. Please try again.'
  );
}
