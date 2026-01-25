import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './App.css'
import './InsightsPanel.css'
import FileUploader from './components/FileUploader'
import InsightsPanel from './components/InsightsPanel'
import Login from './pages/Login'
import Signup from './pages/Signup'
import axios from 'axios';

// Protected Route component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Main Analyzer component (extracted from original App)
function ResumeAnalyzer() {
  const [file, setFile] = useState(null)
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [score, setScore] = useState(null);
  const [insights, setInsights] = useState(null);
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  // only store file locally here — actual upload happens on Analyze
  const handleFileSelected = (f) => {
    setAnswer("");
    setError("");
    setFile(f);
    setScore(null);
    setInsights(null);
  }

  const analyzeFile = async () => {
    if (!file) {
      setError("No file selected.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");
    setScore(null);
    setInsights(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const token = localStorage.getItem('token');
      const res = await axios.post("http://127.0.0.1:8000/rag-query", form, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        timeout: 120000
      });

      // adjust path depending on your backend response shape
      const result = res?.data?.answer ?? res?.data ?? "No answer returned.";
      setAnswer(typeof result === "string" ? result : JSON.stringify(result, null, 2));
      
      // Extract score and insights from response
      if (res?.data?.score !== undefined) {
        setScore(res.data.score);
      }
      if (res?.data?.insights) {
        setInsights(res.data.insights);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let size = bytes
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024
      i++
    }
    return `${size.toFixed(1)} ${units[i]}`
  }

  // Format the analysis result into structured sections
  const formatAnalysis = (text) => {
    if (!text) return null;

    // Split by common section patterns (numbered points, bullet points, or line breaks)
    const lines = text.split(/\n+/).filter(line => line.trim());

    // Try to detect sections and bullet points
    const sections = [];
    let currentSection = { title: null, points: [] };

    lines.forEach((line) => {
      const trimmed = line.trim();

      // Check if it's a section header (ends with : or starts with ## or **)
      if (/^(\*\*|##|#)/.test(trimmed) || /^[A-Z][^.!?]*:$/.test(trimmed) || /^\d+\.\s*[A-Z][^.!?]*:$/.test(trimmed)) {
        if (currentSection.title || currentSection.points.length > 0) {
          sections.push({ ...currentSection });
        }
        currentSection = {
          title: trimmed.replace(/^(\*\*|##|#)\s*/, '').replace(/\*\*$/, '').replace(/:$/, ''),
          points: []
        };
      }
      // Check if it's a bullet point or numbered item
      else if (/^[-•*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
        const point = trimmed.replace(/^[-•*]\s+/, '').replace(/^\d+[.)]\s+/, '');
        currentSection.points.push(point);
      }
      // Regular text - add as a point if not empty
      else if (trimmed.length > 0) {
        // If text contains sentences, split them
        const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
        if (sentences.length > 1) {
          sentences.forEach(s => currentSection.points.push(s.trim()));
        } else {
          currentSection.points.push(trimmed);
        }
      }
    });

    // Don't forget the last section
    if (currentSection.title || currentSection.points.length > 0) {
      sections.push(currentSection);
    }

    // If no clear sections were found, create default sections from the text
    if (sections.length === 0 || (sections.length === 1 && !sections[0].title)) {
      const allPoints = text.split(/[.!?]+/).filter(s => s.trim().length > 10).map(s => s.trim());
      return (
        <div className="analysis-sections">
          <div className="analysis-section">
            <h4 className="section-title">
              <span className="section-icon">📋</span>
              Resume Analysis
            </h4>
            <ul className="section-points">
              {allPoints.map((point, idx) => (
                <li key={idx} className="point-item">{point}.</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    // Assign icons to sections based on keywords
    const getSectionIcon = (title) => {
      const lowerTitle = title?.toLowerCase() || '';
      if (lowerTitle.includes('strength') || lowerTitle.includes('positive') || lowerTitle.includes('good')) return '✅';
      if (lowerTitle.includes('weakness') || lowerTitle.includes('improve') || lowerTitle.includes('suggestion')) return '💡';
      if (lowerTitle.includes('skill') || lowerTitle.includes('technical')) return '🛠️';
      if (lowerTitle.includes('experience') || lowerTitle.includes('work')) return '💼';
      if (lowerTitle.includes('education') || lowerTitle.includes('qualification')) return '🎓';
      if (lowerTitle.includes('summary') || lowerTitle.includes('overview')) return '📊';
      if (lowerTitle.includes('recommendation') || lowerTitle.includes('tip')) return '🎯';
      if (lowerTitle.includes('score') || lowerTitle.includes('rating')) return '⭐';
      if (lowerTitle.includes('format') || lowerTitle.includes('structure')) return '📝';
      if (lowerTitle.includes('contact') || lowerTitle.includes('info')) return '📧';
      return '📋';
    };

    return (
      <div className="analysis-sections">
        {sections.map((section, idx) => (
          <div key={idx} className="analysis-section">
            {section.title && (
              <h4 className="section-title">
                <span className="section-icon">{getSectionIcon(section.title)}</span>
                {section.title}
              </h4>
            )}
            {section.points.length > 0 && (
              <ul className="section-points">
                {section.points.map((point, pIdx) => (
                  <li key={pIdx} className="point-item">{point}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="app-surface">
      <div className="app-container">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">RA</div>
            <div className="brand-text">
              <span className="brand-name">Resume Analyzer</span>
              <span className="brand-tag">SaaS workspace</span>
            </div>
          </div>
          <nav className="topnav" aria-label="Primary">
            <a href="#analyzer" className="nav-link">Analyze</a>
            <a href="#insights" className="nav-link">Insights</a>
            <a href="#help" className="nav-link">Help</a>
          </nav>
          <div className="top-actions">
            {userEmail && <span className="user-email pill">{userEmail}</span>}
            <button className="ghost-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-text">
            <p className="eyebrow">AI resume intelligence</p>
            <h1 className="hero-title">Evaluate, score, and improve resumes in one clean workspace.</h1>
            <p className="hero-subtitle">Upload a PDF, get instant scoring, improvement ideas, and ATS-friendly recommendations.</p>
            <div className="hero-actions">
              <a className="primary-btn" href="#analyzer">Start analyzing</a>
              <a className="ghost-btn" href="#help">View guide</a>
            </div>
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
              <div className="metric-bar-fill" style={{ width: '78%' }}></div>
            </div>
            <p className="metric-note">Powered by Gemini embeddings and RAG for context-accurate answers.</p>
          </div>
        </section>

        <section className="stats-grid" aria-label="Key stats">
          <div className="stat-card">
            <div className="stat-label">Average score uplift</div>
            <div className="stat-value">+22%</div>
            <div className="stat-meta">After applying suggested improvements</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Analysis capacity</div>
            <div className="stat-value">120 files/hr</div>
            <div className="stat-meta">Parallel processing supported</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">ATS readiness</div>
            <div className="stat-value">92%</div>
            <div className="stat-meta">Based on formatting + keywords</div>
          </div>
        </section>

        <section id="analyzer" className="workspace">
          <main className="analyzer-shell">
            <div className="panel-stack">
              <FileUploader onFileSelected={handleFileSelected} />

              <div className="result-section" id="insights">
                <div className="result-card">
                  <div className="result-header">
                    <div className="result-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="result-title">Analysis Result</h3>
                      <p className="result-subtitle">Full breakdown, scoring, and ready-to-use insights.</p>
                    </div>
                    <button className="chip" onClick={analyzeFile} disabled={loading || !file}>{loading ? 'Analyzing…' : 'Run analysis'}</button>
                  </div>

                  {loading && (
                    <div className="loading-container">
                      <div className="loading-spinner">
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                      </div>
                      <p className="loading-text">Analyzing your resume...</p>
                      <p className="loading-subtext">Extracting insights and generating feedback</p>
                    </div>
                  )}

                  {error && (
                    <div className="error-container">
                      <div className="error-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="error-message">{error}</p>
                    </div>
                  )}

                  {!loading && !error && answer && (
                    <div className="answer-container">
                      <div className="answer-content">
                        {formatAnalysis(answer)}
                      </div>
                      <div className="answer-footer">
                        <span className="analysis-badge">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 10V3L4 14H11V21L20 10H13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          AI-Powered Analysis
                        </span>
                      </div>
                    </div>
                  )}

                  {!loading && !error && !answer && (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 17H15M9 13H15M9 9H10M13 3H8.2C7.0799 3 6.51984 3 6.09202 3.21799C5.71569 3.40973 5.40973 3.71569 5.21799 4.09202C5 4.51984 5 5.0799 5 6.2V17.8C5 18.9201 5 19.4802 5.21799 19.908C5.40973 20.2843 5.71569 20.5903 6.09202 20.782C6.51984 21 7.0799 21 8.2 21H15.8C16.9201 21 17.4802 21 17.908 20.782C18.2843 20.5903 18.5903 20.2843 18.782 19.908C19 19.4802 19 18.9201 19 17.8V9M13 3L19 9M13 3V7.4C13 7.96005 13 8.24008 13.109 8.45399C13.2049 8.64215 13.3578 8.79513 13.546 8.89101C13.7599 9 14.0399 9 14.6 9H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="empty-title">No analysis yet</p>
                      <p className="empty-description">Upload a resume and click Analyze to get AI-powered insights</p>
                    </div>
                  )}
                </div>
              </div>

              {(score || answer) && (
                <InsightsPanel file={file} loading={loading} score={score} insights={insights} />
              )}
            </div>
          </main>

          <aside className="side-rail" id="help">
            <div className="file-card">
              <h3>Selected File</h3>
              {file ? (
                <>
                  <div className="file-meta">
                    <span className="file-name" title={file.name}>{file.name}</span>
                    <span className="file-size">{formatSize(file.size)}</span>
                  </div>

                  <div className="actions">
                    <button
                      className="btn btn-primary"
                      onClick={analyzeFile}
                      disabled={loading}
                    >
                      {loading ? "Analyzing…" : "Analyze"}
                    </button>

                    <button
                      className="btn btn-ghost"
                      onClick={() => { setFile(null); setAnswer(""); setError(""); setScore(null); setInsights(null); }}
                      disabled={loading}
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-note">No file selected. Use the uploader to add a PDF.</div>
              )}
            </div>

            <div className="checklist">
              <h4>Quick workflow</h4>
              <ol>
                <li>Drop a PDF resume.</li>
                <li>Run analysis and review score.</li>
                <li>Open Improvements tab and apply fixes.</li>
                <li>Re-upload to validate the uplift.</li>
              </ol>
            </div>

            <div className="help-card callout">
              <h4>Need guidance?</h4>
              <p>Check the improvements tab for quick wins, or rerun to measure uplift.</p>
              <a className="ghost-btn inline" href="#insights">Jump to insights</a>
            </div>
          </aside>
        </section>

        <footer className="app-footer">
          <small>Local demo • Files are not uploaded unless you send them to a backend.</small>
        </footer>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={
        <ProtectedRoute>
          <ResumeAnalyzer />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App
