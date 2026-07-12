/**
 * constants/apiEndpoints.js
 * Single source of truth for all backend API paths.
 * Change an endpoint once here — it updates everywhere.
 */
export const ENDPOINTS = {
  // Analysis
  ANALYZE:         '/rag-query',
  SCORE_BREAKDOWN: '/analyze-score',
  IMPROVEMENTS:    '/analyze-improvements',
  STRENGTHS:       '/analyze-strengths',
  RADAR:           '/analyze-radar',

  // Jobs
  EXTRACT_SKILLS:  '/jobs/extract-skills',
  FETCH_JOBS:      '/jobs/fetch-jobs',
  RANK_JOBS:       '/jobs/rank-jobs',

  // Auth
  LOGIN:           '/login',
  SIGNUP:          '/signup',
};
