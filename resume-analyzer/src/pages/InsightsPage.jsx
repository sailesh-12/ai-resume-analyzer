/**
 * pages/InsightsPage.jsx  [Phase 5 — upgraded]
 *
 * Now uses reusable EmptyState, ErrorState, and SkeletonCard.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { EmptyState }   from '../components/ui/EmptyState';
import { ErrorState }   from '../components/ui/ErrorState';
import { SkeletonCard } from '../components/ui/Skeleton';
import InsightsPanel from '../components/InsightsPanel';
import { ROUTES } from '../constants/routes';

export default function InsightsPage() {
  const { file, answer, loading, error, score, insights, analyzeFile, resetAnalysis } = useAnalysis();
  const navigate = useNavigate();

  useEffect(() => {
    if (file && !answer && !loading && !error) analyzeFile(file);
  }, [file, answer, loading, error, analyzeFile]);

  const handleBack = () => { resetAnalysis(); navigate(ROUTES.UPLOAD); };

  if (loading) return (
    <div className="analyzer-shell">
      <div className="result-header">
        <span className="result-icon" aria-hidden="true"></span>
        <div>
          <h3 className="result-title">Building your insights dashboard…</h3>
          <p className="result-subtitle">Extracting metrics &amp; querying Gemini AI</p>
        </div>
      </div>
      <div className="analysis-sections">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    </div>
  );

  if (error) return (
    <div className="analyzer-shell state-centered">
      <ErrorState title="Analysis Failed" message={error} onRetry={handleBack} />
    </div>
  );

  if (!file) return (
    <div className="analyzer-shell state-centered">
      <EmptyState
        title="No active analysis"
        description="Upload a resume first to view the detailed insights dashboard."
        action={<button className="btn btn--primary" onClick={handleBack}>Go to Upload</button>}
      />
    </div>
  );

  return (
    <>
      <div className="result-summary-bar">
        <div className="result-summary-info">
          <span aria-hidden="true"></span>
          <div>
            <h2 className="result-filename">{file.name}</h2>
            <p className="result-status">Analysis Complete · Detailed Dashboard</p>
          </div>
        </div>
        <button className="btn btn--ghost" onClick={handleBack}>Upload Another</button>
      </div>

      <div className="analyzer-shell">
        <div className="result-header">
          <span className="result-icon" aria-hidden="true">📊</span>
          <div>
            <h3 className="result-title">Executive Scoreboard &amp; Radar Analysis</h3>
            <p className="result-subtitle">Visual charts, key metrics, score breakdown, strengths and ATS improvements.</p>
          </div>
        </div>
        <InsightsPanel file={file} loading={loading} score={score} insights={insights} />
      </div>
    </>
  );
}
