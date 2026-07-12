/**
 * context/AnalysisContext.jsx  [Phase 3 update]
 *
 * Now uses a status enum instead of two boolean flags.
 * Status: 'idle' | 'loading' | 'success' | 'error'
 * handleLogout removed — auth is now AuthContext's responsibility.
 */
import { useState, createContext, useContext } from 'react';
import { analyzeResume, getRadarAnalysis, extractErrorMessage } from '../services/analysisService';

const AnalysisContext = createContext(null);

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used inside <AnalysisProvider>');
  return ctx;
}

export function AnalysisProvider({ children }) {
  const [file,     setFile]     = useState(null);
  const [answer,   setAnswer]   = useState('');
  const [analysisResponse, setAnalysisResponse] = useState(null); // Full API response
  const [radarData, setRadarData] = useState(null); // Radar analysis (6 dimensions)
  const [status,   setStatus]   = useState('idle'); // idle | loading | success | error
  const [error,    setError]    = useState('');
  const [score,    setScore]    = useState(null);
  const [insights, setInsights] = useState(null);

  const analyzeFile = async (selectedFile = file) => {
    if (!selectedFile) { setError('No file selected.'); return; }

    setStatus('loading');
    setError('');
    setAnswer('');
    setAnalysisResponse(null);
    setRadarData(null);
    setScore(null);
    setInsights(null);

    try {
      // Fire main analysis and radar in parallel for speed
      const [mainResult, radarResult] = await Promise.allSettled([
        analyzeResume(selectedFile),
        getRadarAnalysis(selectedFile),
      ]);

      // Handle main analysis
      if (mainResult.status === 'rejected') throw mainResult.reason;
      const data = mainResult.value;

      // Store full response
      setAnalysisResponse(data);

      // Extract legacy fields for backward compatibility
      const result = data?.answer ?? data?.professional_assessment ?? 'No answer returned.';
      setAnswer(typeof result === 'string' ? result : JSON.stringify(result, null, 2));

      // Coerce score to number — API may return string "7" instead of 7
      if (data?.score !== undefined) setScore(Number(data.score) || 0);
      if (data?.insights)            setInsights(data.insights);

      // Handle radar (non-fatal)
      if (radarResult.status === 'fulfilled') {
        setRadarData(radarResult.value);
      } else {
        console.warn('Radar analysis failed:', radarResult.reason);
      }

      setStatus('success');
    } catch (err) {
      setError(extractErrorMessage(err));
      setStatus('error');
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setAnswer('');
    setAnalysisResponse(null);
    setRadarData(null);
    setScore(null);
    setInsights(null);
    setError('');
    setStatus('idle');
  };

  // Convenience booleans derived from status (backward-compatible)
  const loading = status === 'loading';

  return (
    <AnalysisContext.Provider value={{
      file, setFile,
      answer,
      analysisResponse,
      radarData,
      status, loading,  // both available for backward compat
      error,
      score,
      insights,
      analyzeFile,
      resetAnalysis,
    }}>
      {children}
    </AnalysisContext.Provider>
  );
}
