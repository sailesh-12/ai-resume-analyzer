/**
 * layouts/Topbar.jsx
 *
 * The unified navigation header used across all authenticated pages.
 * Extracted from App.jsx so the header exists in exactly ONE place.
 *
 * Responsibilities:
 *  - Brand logo + name
 *  - Primary navigation (Upload / Quality Report / Detailed Insights)
 *  - Nav guard rails: Results and Insights tabs disabled until a file is loaded
 *  - Theme toggle button
 *  - User email pill + Logout button
 *
 * It reads state from AnalysisContext — no props needed except `activePage`.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { ROUTES } from '../constants/routes';

const NAV_ITEMS = [
  { label: 'Upload',            path: ROUTES.UPLOAD,   key: 'upload',   requiresFile: false },
  { label: 'Quality Report',   path: ROUTES.RESULTS,  key: 'results',  requiresFile: true  },
  { label: 'Detailed Insights',path: ROUTES.INSIGHTS, key: 'insights', requiresFile: true  },
  { label: 'Find Jobs',        path: ROUTES.JOBS,     key: 'jobs',     requiresFile: false },
];

export function Topbar() {
  const { file, resetAnalysis } = useAnalysis();
  const { logout, user }  = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const userEmail  = user?.email || localStorage.getItem('userEmail');

  const handleNavClick = (item) => {
    if (item.requiresFile && !file) return;
    if (item.key === 'upload') resetAnalysis();
    navigate(item.path);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="topbar" role="banner">
      {/* Brand */}
      <div
        className="brand"
        onClick={() => { resetAnalysis(); navigate(ROUTES.UPLOAD); }}
        style={{ cursor: 'pointer' }}
        role="link"
        aria-label="Go to home"
      >
        <div className="brand-mark" aria-hidden="true">RA</div>
        <div className="brand-text">
          <span className="brand-name">Resume Analyzer</span>
          <span className="brand-tag">AI-powered workspace</span>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="topnav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const disabled = item.requiresFile && !file;
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item)}
              className={`nav-link${isActive(item.path) ? ' active-link' : ''}`}
              disabled={disabled}
              aria-current={isActive(item.path) ? 'page' : undefined}
              aria-disabled={disabled}
              title={disabled ? 'Upload a resume first' : item.label}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User Actions */}
      <div className="top-actions">
        <ThemeToggle />
        {userEmail && (
          <span className="pill user-email" title={userEmail}>
            {userEmail}
          </span>
        )}
        <button className="ghost-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
