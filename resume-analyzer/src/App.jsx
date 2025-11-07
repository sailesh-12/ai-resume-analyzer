import { useState } from 'react'
import './App.css'
import FileUploader from './components/FileUploader'
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null)
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // only store file locally here — actual upload happens on Analyze
  const handleFileSelected = (f) => {
    setAnswer("");
    setError("");
    setFile(f);
  }

  const analyzeFile = async () => {
    if (!file) {
      setError("No file selected.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await axios.post("http://127.0.0.1:8000/rag-query", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000
      });

      // adjust path depending on your backend response shape
      const result = res?.data?.answer ?? res?.data ?? "No answer returned.";
      setAnswer(typeof result === "string" ? result : JSON.stringify(result, null, 2));
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

  return (
    <div className="app-surface">
      <div className="app-container">
        <header className="app-header">
          <h1 className="title">Resume Analyzer</h1>
          <p className="subtitle">Upload a resume PDF to extract, index and query content.</p>
        </header>

        <main className="card">
          <div className="uploader-column">
            <FileUploader onFileSelected={handleFileSelected} />

            {/* Result / answer area below uploader for better visibility */}
            <div style={{ marginTop: 14 }}>
              <div className="file-card" style={{ padding: 12 }}>
                <h3>Analysis Result</h3>

                {loading && <div style={{ color: '#0b74ff', fontWeight: 700 }}>Analyzing... Please wait.</div>}

                {error && <div style={{ color: 'var(--danger)', fontWeight: 700 }}>{error}</div>}

                {!loading && !error && answer && (
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 360,
                    overflow: 'auto',
                    background: '#fcfdff',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid rgba(8,20,40,0.03)'
                  }}>
                    {answer}
                  </pre>
                )}

                {!loading && !error && !answer && (
                  <div className="empty-note">No analysis yet. Click Analyze to start.</div>
                )}
              </div>
            </div>
          </div>

          <aside className="info-column">
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
                      onClick={() => { setFile(null); setAnswer(""); setError(""); }}
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

            <div className="help-card">
              <h4>Tips</h4>
              <ul>
                <li>Only PDF resumes are supported.</li>
                <li>Large files may take longer to process.</li>
                <li>Use the preview to verify uploaded content.</li>
              </ul>
            </div>
          </aside>
        </main>

        <footer className="app-footer">
          <small>Local demo • Files are not uploaded unless you send them to a backend.</small>
        </footer>
      </div>
    </div>
  )
}

export default App
