/**
 * utils/getSectionMeta.js
 * Pure function — returns icon and accent color for a given section title.
 * No React dependency. Fully unit-testable.
 */

const SECTION_MAP = [
  {
    keywords: ['strength', 'positive', 'good', 'highlight'],
    icon: '✅',
    color: '#059669', // emerald-600
  },
  {
    keywords: ['weakness', 'improve', 'improvement', 'suggestion', 'area'],
    icon: '💡',
    color: '#d97706', // amber-600
  },
  {
    keywords: ['skill', 'technical', 'technology', 'tool'],
    icon: '🛠️',
    color: '#2563eb', // blue-600
  },
  {
    keywords: ['experience', 'work', 'employment', 'career'],
    icon: '💼',
    color: '#7c3aed', // violet-600
  },
  {
    keywords: ['education', 'qualification', 'degree', 'academic'],
    icon: '🎓',
    color: '#0891b2', // cyan-600
  },
  {
    keywords: ['summary', 'overview', 'profile'],
    icon: '📊',
    color: '#0369a1', // sky-700
  },
  {
    keywords: ['recommendation', 'tip', 'action', 'next step'],
    icon: '🎯',
    color: '#be185d', // pink-700
  },
  {
    keywords: ['score', 'rating', 'ats', 'rank'],
    icon: '⭐',
    color: '#b45309', // amber-700
  },
  {
    keywords: ['format', 'structure', 'layout', 'presentation'],
    icon: '📝',
    color: '#4f46e5', // indigo-600
  },
];

const FALLBACK = { icon: '📋', color: '#64748b' }; // slate-500

/**
 * @param {string} title - Section title from the parsed LLM output
 * @returns {{ icon: string, color: string }}
 */
export function getSectionMeta(title) {
  const lower = (title ?? '').toLowerCase();
  return (
    SECTION_MAP.find((entry) => entry.keywords.some((k) => lower.includes(k))) ??
    FALLBACK
  );
}
