/**
 * pages/UploadPage.jsx
 *
 * The entry point of the app. Users land here, select a PDF resume,
 * and click "Start Analysis" to navigate to the Results page.
 *
 * Layout shell (Topbar + app-surface wrapper) is handled by AppLayout —
 * this page only renders its OWN content.
 */
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import FileUploader from '../components/FileUploader';
import { ROUTES } from '../constants/routes';

export default function UploadPage() {
  const { file, setFile, resetAnalysis } = useAnalysis();
  const navigate = useNavigate();

  const handleFileSelected = (selectedFile) => {
    setFile(selectedFile);
  };

  const handleStartAnalysis = () => {
    if (!file) return;
    navigate(ROUTES.RESULTS);
  };

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">AI resume intelligence</p>
          <h1 className="hero-title">
            Evaluate, score, and improve resumes in one clean workspace.
          </h1>
          <p className="hero-subtitle">
            Upload a PDF, get instant scoring, improvement ideas, and ATS-friendly recommendations.
          </p>
        </div>
        <div className="hero-card">
          <div className="mini-label">Live preview</div>
          <div className="hero-metric">
            <div>
              <div className="metric-value">~60s</div>
              <div className="metric-label">Average turnaround</div>
            </div>
            <div>
              <div className="metric-value">A+</div>
              <div className="metric-label">Formatting focus</div>
            </div>
          </div>
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: '78%' }} />
          </div>
          <p className="metric-note">
            Powered by Gemini embeddings and RAG for context-accurate answers.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-grid" aria-label="Key platform stats">
        <div className="stat-card">
          <div className="stat-label">Average score uplift</div>
          <div className="stat-value">+22%</div>
          <div className="stat-meta">After applying suggested improvements</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Analysis capacity</div>
          <div className="stat-value">120/hr</div>
          <div className="stat-meta">Parallel processing supported</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ATS readiness</div>
          <div className="stat-value">92%</div>
          <div className="stat-meta">Based on formatting + keywords</div>
        </div>
      </section>

      {/* Upload Shell */}
      <div className="upload-section">
        <div className="analyzer-shell">
          <h2 className="upload-heading">Upload your Resume</h2>
          <p className="upload-subtext">
            Drop your resume in PDF format below. We will analyze the formatting,
            experience, skills, and structure to generate a comprehensive quality report.
          </p>

          <FileUploader onFileSelected={handleFileSelected} />

          {file && (
            <div className="file-ready-bar">
              <div className="file-ready-info">
                <span className="file-ready-icon" aria-hidden="true">📄</span>
                <div>
                  <span className="file-ready-name" title={file.name}>{file.name}</span>
                  <span className="file-ready-type">PDF Document</span>
                </div>
              </div>
              <button className="primary-btn" onClick={handleStartAnalysis}>
                Start Analysis
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="app-footer">
        <small>Local demo — files are processed securely and not stored.</small>
      </footer>
    </>
  );
}
