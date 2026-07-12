/**
 * services/jobsService.js
 * All job-related API calls in one place.
 * Components and hooks import these named functions — never raw axios calls.
 *
 * Error handling:
 *  - All functions throw on failure — the caller (hook/component) handles UI state.
 *  - Errors include backend detail and status codes.
 */
import api from './api';
import { ENDPOINTS } from '../constants/apiEndpoints';

/**
 * Extracts technical skills from resume.
 * @param {File} file - The PDF resume file
 * @returns {Promise<{ technical_skills: string[], soft_skills: string[], experience_years: number, education: string[], proficiency_levels: object }>}
 */
export async function extractSkills(file) {
  const form = new FormData();
  form.append('file', file);

  const { data } = await api.post(ENDPOINTS.EXTRACT_SKILLS, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

/**
 * Fetches jobs from Adzuna API matching resume skills.
 * @param {File} file - The PDF resume file
 * @param {Object} options - Optional filters
 * @param {string} options.location - Job location (default: "US")
 * @param {number} options.results_per_page - Number of jobs per page (default: 50)
 * @param {number} options.salary_min - Minimum salary filter
 * @param {number} options.salary_max - Maximum salary filter
 * @returns {Promise<{ jobs: object[], total: number, page: number, results_returned: number, location: string, skills_searched: string[] }>}
 */
export async function fetchJobs(file, options = {}) {
  const form = new FormData();
  form.append('file', file);

  const queryParams = new URLSearchParams();
  if (options.location) queryParams.append('location', options.location);
  if (options.results_per_page) queryParams.append('results_per_page', options.results_per_page);
  if (options.salary_min) queryParams.append('salary_min', options.salary_min);
  if (options.salary_max) queryParams.append('salary_max', options.salary_max);

  const queryString = queryParams.toString();
  const url = queryString ? `${ENDPOINTS.FETCH_JOBS}?${queryString}` : ENDPOINTS.FETCH_JOBS;

  const { data } = await api.post(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

/**
 * Ranks jobs against resume using AI.
 * @param {File} file - The PDF resume file
 * @param {Array} jobs - Array of job objects from fetchJobs
 * @returns {Promise<{ ranked_jobs: object[], candidate_skills: string[], top_matches: string[], total_ranked: number }>}
 */
export async function rankJobs(file, jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    throw new Error('At least one job must be provided for ranking');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('jobs_json', JSON.stringify(jobs));

  const { data } = await api.post(ENDPOINTS.RANK_JOBS, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

/**
 * Normalizes the error from an axios rejection into a human-readable string.
 * Handles backend error formats.
 * @param {unknown} err
 * @returns {string}
 */
export function extractErrorMessage(err) {
  const detail = err?.response?.data?.detail;
  
  if (typeof detail === 'string') {
    return detail;
  }
  
  if (detail?.message) {
    return detail.message;
  }
  
  return (
    err?.response?.data?.error ||
    err?.message ||
    'Job operation failed. Please try again.'
  );
}
