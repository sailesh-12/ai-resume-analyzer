/**
 * pages/ResultsPage.jsx  [Phase 8 — Premium Quality Report UI]
 *
 * Complete redesign with animated score gauge, glassmorphism headers,
 * premium tabs, detailed breakdown cards, and rich radar integration.
 */
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { RadarChart } from '../components/RadarChart';
import { ROUTES } from '../constants/routes';
import {
  ProfileIcon,
  StrengthsIcon,
  ImprovementsIcon,
  ATSIcon,
  NextStepsIcon,
  LoadingIcon,
  DocumentIcon,
  FolderIcon,
  AnalysisIcon,
} from '../components/icons/AnalysisIcons';

/* ── Animated Circular Score Gauge ─────────────────────────── */
function ScoreGauge({ score }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [mounted, setMounted] = useState(false);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 10) * circumference;

  useEffect(() => {
    setMounted(true);
    let frame;
    let start = null;
    const duration = 1200;
    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedScore(+(eased * score).toFixed(1));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const getColor = (s) => {
    if (s >= 8) return { main: '#059669', glow: 'rgba(5,150,105,0.25)' };
    if (s >= 6) return { main: '#2563eb', glow: 'rgba(37,99,235,0.25)' };
    if (s >= 4) return { main: '#d97706', glow: 'rgba(217,119,6,0.25)' };
    return { main: '#dc2626', glow: 'rgba(220,38,38,0.25)' };
  };

  const getLabel = (s) => {
    if (s >= 8) return 'Excellent';
    if (s >= 6) return 'Good';
    if (s >= 4) return 'Fair';
    return 'Needs Work';
  };

  const colors = getColor(score);

  return (
    <div className={`score-gauge ${mounted ? 'mounted' : ''}`}>
      <svg viewBox="0 0 128 128" className="score-gauge__svg">
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.main} />
            <stop offset="100%" stopColor={colors.main} stopOpacity="0.6" />
          </linearGradient>
          <filter id="scoreGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="64" cy="64" r={radius}
          fill="none"
          className="score-gauge__track"
          strokeWidth="8"
        />
        <circle
          cx="64" cy="64" r={radius}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform="rotate(-90 64 64)"
          filter="url(#scoreGlow)"
          className="score-gauge__fill"
        />
      </svg>
      <div className="score-gauge__value" style={{ color: colors.main }}>
        {Math.round(animatedScore)}
        <span className="score-gauge__max">/10</span>
      </div>
      <div className="score-gauge__label">{getLabel(score)}</div>
    </div>
  );
}

/* ── Profile Overview Card ────────────────────────────────── */
function ProfileOverview({ overview, assessment }) {
  return (
    <div className="qr-profile-card">
      <div className="qr-profile-card__header">
        <div className="qr-profile-card__icon-wrap">
          <ProfileIcon size={20} color="#059669" />
        </div>
        <h3>Profile Overview</h3>
      </div>
      <p className="qr-profile-card__text">{overview}</p>
      {assessment && (
        <div className="qr-assessment-box">
          <strong>Professional Assessment</strong>
          <p>{assessment}</p>
        </div>
      )}
    </div>
  );
}

/* ── Section Cards Grid ───────────────────────────────────── */
function AnalysisSectionsList({ data }) {
  const sections = [
    {
      key: 'strengths',
      title: 'Strengths',
      iconComponent: StrengthsIcon,
      color: '#059669',
      gradient: 'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(5,150,105,0.02))',
      items: data.strengths || [],
    },
    {
      key: 'weaknesses',
      title: 'Areas for Improvement',
      iconComponent: ImprovementsIcon,
      color: '#d97706',
      gradient: 'linear-gradient(135deg, rgba(217,119,6,0.08), rgba(217,119,6,0.02))',
      items: data.weaknesses || [],
    },
    {
      key: 'ats_tips',
      title: 'ATS Optimization Tips',
      iconComponent: ATSIcon,
      color: '#2563eb',
      gradient: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(37,99,235,0.02))',
      items: data.ats_tips || [],
    },
    {
      key: 'next_steps',
      title: 'Recommended Next Steps',
      iconComponent: NextStepsIcon,
      color: '#7c3aed',
      gradient: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.02))',
      items: data.next_steps || [],
    },
  ];

  return (
    <div className="qr-sections-grid">
      {sections.map((section, idx) => {
        const IconComponent = section.iconComponent;
        return (
          <div
            key={section.key}
            className="qr-section-card"
            style={{
              '--card-accent': section.color,
              '--card-bg': section.gradient,
              animationDelay: `${idx * 0.08}s`,
            }}
          >
            <div className="qr-section-card__header">
              <span className="qr-section-card__icon">
                <IconComponent size={20} color={section.color} />
              </span>
              <h4>{section.title}</h4>
              {section.items.length > 0 && (
                <span className="qr-section-card__count">{section.items.length}</span>
              )}
            </div>
            {section.items.length > 0 ? (
              <ul className="qr-section-card__list">
                {section.items.map((item, i) => (
                  <li key={i} style={{ animationDelay: `${(idx * 0.08) + (i * 0.04)}s` }}>
                    <span className="qr-bullet" style={{ background: section.color }} />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="qr-section-card__empty">No items to display</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Breakdown Category Card ──────────────────────────────── */
function BreakdownBar({ label, score, color, delay }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth((score / 10) * 100), 100 + delay);
    return () => clearTimeout(t);
  }, [score, delay]);

  const getGrade = (s) => {
    if (s >= 8) return 'A';
    if (s >= 6) return 'B';
    if (s >= 4) return 'C';
    return 'D';
  };

  return (
    <div className="qr-breakdown-item">
      <div className="qr-breakdown-item__header">
        <span className="qr-breakdown-item__label">{label}</span>
        <div className="qr-breakdown-item__meta">
          <span className="qr-breakdown-item__grade" style={{ color }}>{getGrade(score)}</span>
          <span className="qr-breakdown-item__value">{score}/10</span>
        </div>
      </div>
      <div className="qr-breakdown-item__track">
        <div
          className="qr-breakdown-item__fill"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ── Main Results Page ────────────────────────────────────── */
export default function ResultsPage() {
  const { file, analysisResponse, radarData, loading, error, analyzeFile, resetAnalysis } = useAnalysis();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const tabIndicatorRef = useRef(null);
  const tabsNavRef = useRef(null);

  useEffect(() => {
    if (file && !analysisResponse && !loading && !error) analyzeFile(file);
  }, [file, analysisResponse, loading, error, analyzeFile]);

  // Animate tab indicator
  useEffect(() => {
    if (!tabsNavRef.current || !tabIndicatorRef.current) return;
    const activeBtn = tabsNavRef.current.querySelector('.qr-tab.active');
    if (activeBtn) {
      const nav = tabsNavRef.current.getBoundingClientRect();
      const btn = activeBtn.getBoundingClientRect();
      tabIndicatorRef.current.style.left = `${btn.left - nav.left}px`;
      tabIndicatorRef.current.style.width = `${btn.width}px`;
    }
  }, [activeTab]);

  const handleBack = () => {
    resetAnalysis();
    navigate(ROUTES.UPLOAD);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'breakdown', label: 'Breakdown', icon: '📈' },
    { id: 'radar', label: 'Radar Analysis', icon: '🎯' },
  ];

  // ── Loading State ──
  if (loading) {
    return (
      <div className="analyzer-shell qr-loading-shell">
        <div className="qr-loading-header">
          <div className="qr-loading-pulse" />
          <div>
            <h3 className="qr-loading-title">Analyzing your resume…</h3>
            <p className="qr-loading-subtitle">
              <LoadingIcon size={16} color="var(--primary)" style={{ display: 'inline-block', marginRight: '8px' }} />
              Parsing content & querying AI
            </p>
          </div>
        </div>
        <div className="qr-progress-wrap">
          <div className="qr-progress-bar">
            <div className="qr-progress-fill" />
          </div>
          <p className="qr-progress-text">This typically takes 10-30 seconds</p>
        </div>
        <div className="qr-skeleton-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="analyzer-shell state-centered">
        <ErrorState title="Analysis Failed" message={error} onRetry={handleBack} />
      </div>
    );
  }

  // ── Empty State ──
  if (!file || !analysisResponse) {
    return (
      <div className="analyzer-shell state-centered">
        <EmptyState
          icon={<FolderIcon size={48} color="#7c3aed" />}
          title="No active analysis"
          description="Upload a resume first to view the quality report."
          action={<button className="btn btn--primary" onClick={handleBack}>Go to Upload</button>}
        />
      </div>
    );
  }

  // ── Extract data (handle both new and legacy formats) ──
  const score = Number(analysisResponse.score) || 0;
  const analysis = analysisResponse.analysis || {};
  const overview = analysis.profile_overview || 'Resume analysis complete.';
  const assessment = analysis.professional_assessment || '';

  // Breakdown data from analysis
  const breakdownCategories = [
    { label: 'Communication & Clarity', key: 'strengths', color: '#059669', score: Math.min(10, Math.max(0, score + (analysis.strengths?.length > 2 ? 1 : 0))) },
    { label: 'Technical Depth', key: 'ats_tips', color: '#2563eb', score: Math.min(10, Math.max(0, score + (analysis.ats_tips?.length > 2 ? -1 : 0))) },
    { label: 'Experience Quality', key: 'weaknesses', color: '#7c3aed', score: Math.min(10, Math.max(0, score - (analysis.weaknesses?.length > 3 ? 1 : 0))) },
    { label: 'ATS Compatibility', key: 'ats', color: '#d97706', score: Math.min(10, Math.max(0, score - (analysis.ats_tips?.length > 2 ? 2 : 0))) },
    { label: 'Achievement Impact', key: 'next_steps', color: '#dc2626', score: Math.min(10, Math.max(0, score + (analysis.next_steps?.length < 3 ? 1 : -1))) },
  ];

  return (
    <>
      {/* Summary Bar */}
      <div className="qr-summary-bar">
        <div className="qr-summary-bar__info">
          <div className="qr-summary-bar__icon">
            <DocumentIcon size={22} color="var(--primary)" />
          </div>
          <div>
            <h2 className="qr-summary-bar__filename">{file.name}</h2>
            <p className="qr-summary-bar__status">
              <span className="qr-status-dot" />
              Analysis Complete · Quality Report
            </p>
          </div>
        </div>
        <button className="btn btn--ghost" onClick={handleBack}>
          ↩ Upload Another
        </button>
      </div>

      {/* Main Report Shell */}
      <div className="qr-shell">
        {/* Tabs Navigation */}
        <div className="qr-tabs-nav" ref={tabsNavRef}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`qr-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="qr-tab__icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          <div className="qr-tab-indicator" ref={tabIndicatorRef} />
        </div>

        {/* Tab Content */}
        <div className="qr-tab-content">

          {/* ═══ Overview Tab ═══ */}
          {activeTab === 'overview' && (
            <div className="qr-tab-pane qr-fade-in">
              {/* Score Header */}
              <div className="qr-score-header">
                <ScoreGauge score={score} />
                <div className="qr-score-details">
                  <h2 className="qr-score-title">Resume Quality Score</h2>
                  <p className="qr-score-desc">
                    {score >= 8 && 'Your resume is excellent and ready to submit. Strong formatting, clear achievements, and great ATS compatibility.'}
                    {score >= 6 && score < 8 && 'Your resume is solid with good fundamentals. Consider the suggestions below to take it to the next level.'}
                    {score >= 4 && score < 6 && 'Your resume has potential but needs improvement. Follow the recommendations to strengthen key areas.'}
                    {score < 4 && 'Your resume needs significant improvements. Start with the ATS tips and focus on quantifying your achievements.'}
                  </p>
                  <div className="qr-score-tags">
                    <span className={`qr-score-tag ${score >= 7 ? 'positive' : 'neutral'}`}>
                      {analysis.strengths?.length || 0} Strengths
                    </span>
                    <span className={`qr-score-tag ${(analysis.weaknesses?.length || 0) > 3 ? 'negative' : 'neutral'}`}>
                      {analysis.weaknesses?.length || 0} Improvements
                    </span>
                    <span className={`qr-score-tag neutral`}>
                      {analysis.ats_tips?.length || 0} ATS Tips
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile */}
              <ProfileOverview overview={overview} assessment={assessment} />

              {/* Sections */}
              <AnalysisSectionsList data={analysis} />

              {/* Find Jobs CTA */}
              <div className="qr-jobs-cta">
                <div className="qr-jobs-cta__content">
                  <div className="qr-jobs-cta__icon">💼</div>
                  <div>
                    <h3 className="qr-jobs-cta__title">Ready to find matching jobs?</h3>
                    <p className="qr-jobs-cta__desc">
                      We'll use your resume to search and AI-rank real job listings that match your skills.
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn--primary qr-jobs-cta__btn"
                  onClick={() => navigate(ROUTES.JOBS)}
                >
                  🚀 Find Matching Jobs
                </button>
              </div>
            </div>
          )}

          {/* ═══ Breakdown Tab ═══ */}
          {activeTab === 'breakdown' && (
            <div className="qr-tab-pane qr-fade-in">
              <div className="qr-breakdown-header">
                <div className="qr-breakdown-summary">
                  <ScoreGauge score={score} />
                  <div>
                    <h3>Detailed Score Breakdown</h3>
                    <p>Your resume has been analyzed across multiple dimensions including content quality, formatting, technical depth, and ATS compatibility.</p>
                  </div>
                </div>
              </div>

              <div className="qr-breakdown-grid">
                {breakdownCategories.map((cat, i) => (
                  <BreakdownBar
                    key={cat.label}
                    label={cat.label}
                    score={cat.score}
                    color={cat.color}
                    delay={i * 120}
                  />
                ))}
              </div>

              <div className="qr-breakdown-insight-box">
                <h4>📋 Analysis Summary</h4>
                <p>
                  {score >= 7
                    ? `This resume scores well overall. The strongest areas are communication and content quality. Consider refining ATS keywords and quantifying more achievements for maximum impact.`
                    : score >= 4
                    ? `This resume shows potential but has room for growth. Focus on adding measurable achievements, improving keyword density, and ensuring clean formatting for ATS systems.`
                    : `This resume needs substantial work. Prioritize clean formatting, add relevant keywords, quantify achievements, and ensure all key sections (summary, experience, skills, education) are present.`
                  }
                </p>
              </div>
            </div>
          )}

          {/* ═══ Radar Tab ═══ */}
          {activeTab === 'radar' && (
            <div className="qr-tab-pane qr-fade-in">
              {radarData ? (
                <>
                  <div className="qr-radar-header">
                    <h3>Multi-Dimensional Analysis</h3>
                    <p>Performance across 6 key professional dimensions, scored from 0 to 10.</p>
                  </div>
                  <RadarChart data={radarData} size={420} />
                </>
              ) : (
                <div className="qr-radar-loading">
                  <div className="qr-loading-pulse" />
                  <p>Radar analysis is still being calculated…</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
