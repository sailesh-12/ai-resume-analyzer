/**
 * utils/formatAnalysis.js
 * Pure function — parses raw LLM text into a structured sections array.
 * Returns: Array<{ title: string | null, points: string[] }>
 * No React dependency. Fully unit-testable.
 */

/**
 * @param {string} text - Raw LLM response text
 * @returns {Array<{ title: string|null, points: string[] }>}
 */
export function parseAnalysisText(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split(/\n+/).filter((line) => line.trim());
  const sections = [];
  let currentSection = { title: null, points: [] };

  const isHeading = (line) =>
    /^(\*\*|##|#)/.test(line) ||
    /^[A-Z][^.!?]*:$/.test(line) ||
    /^\d+\.\s*[A-Z][^.!?]*:$/.test(line);

  const isBullet = (line) =>
    /^[-•*]\s+/.test(line) || /^\d+[.)]\s+/.test(line);

  const cleanHeading = (line) =>
    line
      .replace(/^(\*\*|##|#)\s*/, '')
      .replace(/\*\*$/, '')
      .replace(/:$/, '')
      .trim();

  const cleanBullet = (line) =>
    line.replace(/^[-•*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (isHeading(trimmed)) {
      if (currentSection.title || currentSection.points.length > 0) {
        sections.push({ ...currentSection });
      }
      currentSection = { title: cleanHeading(trimmed), points: [] };
    } else if (isBullet(trimmed)) {
      currentSection.points.push(cleanBullet(trimmed));
    } else {
      // Plain prose — split into sentences if multiple exist
      const sentences = trimmed
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);

      if (sentences.length > 1) {
        sentences.forEach((s) => currentSection.points.push(s));
      } else {
        currentSection.points.push(trimmed);
      }
    }
  });

  // Push the last open section
  if (currentSection.title || currentSection.points.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Fallback for completely unstructured text — splits into sentences.
 * @param {string} text
 * @returns {Array<{ title: null, points: string[] }>}
 */
export function parseFallbackText(text) {
  const points = (text ?? '')
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
  return [{ title: null, points }];
}
