/**
 * components/icons/AnalysisIcons.jsx
 * Custom SVG icons for resume analysis sections - unique and professional design
 */

// Profile icon - minimalist head with document
export function ProfileIcon({ size = 24, color = '#059669' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <path d="M9 14h6" />
      <path d="M8 18h8" />
    </svg>
  );
}

// Strengths icon - upward trending graph
export function StrengthsIcon({ size = 24, color = '#059669' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 17" />
      <polyline points="23 6 23 12 17 12" />
      <circle cx="12" cy="12" r="1" fill={color} />
      <circle cx="19" cy="5" r="1" fill={color} />
    </svg>
  );
}

// Improvements icon - target with checkmarks
export function ImprovementsIcon({ size = 24, color = '#d97706' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M7 7l2.83 2.83" />
      <path d="M13.17 13.17l2.83 2.83" />
    </svg>
  );
}

// ATS Optimization icon - document with checkmark
export function ATSIcon({ size = 24, color = '#2563eb' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10 14l2 2 4-4" />
      <line x1="8" y1="19" x2="16" y2="19" />
    </svg>
  );
}

// Next Steps icon - rocket with trail
export function NextStepsIcon({ size = 24, color = '#7c3aed' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 13c0-1 .895-2 2-2s2 1 2 2-1 3-2 3-2-2-2-3z" />
      <path d="M6 11V3h6l4 4v10" />
      <circle cx="16" cy="3" r="1" fill={color} />
      <path d="M12 17h6a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// Loading icon - animated spinner
export function LoadingIcon({ size = 24, color = '#2563eb' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      className="animate-spin"
    >
      <circle cx="12" cy="12" r="10" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeDasharray="15.7" />
    </svg>
  );
}

// Document icon - clean and simple
export function DocumentIcon({ size = 24, color = '#4b5563' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

// Folder icon - for empty state
export function FolderIcon({ size = 24, color = '#7c3aed' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="12" r="3" fill={color} opacity="0.2" />
    </svg>
  );
}

// Analysis icon - for results header
export function AnalysisIcon({ size = 24, color = '#2563eb' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12h18" />
      <path d="M3 6h18" />
      <path d="M3 18h18" />
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="6" y1="9" x2="6" y2="15" />
      <line x1="12" y1="9" x2="12" y2="15" />
      <line x1="18" y1="9" x2="18" y2="15" />
    </svg>
  );
}
