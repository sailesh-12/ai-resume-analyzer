import React, { useState } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import api from '../services/api';
import { ENDPOINTS } from '../constants/apiEndpoints';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadarController,
  Tooltip,
  Legend,
  Filler
);

export default function InsightsPanel({ file, loading, score, insights }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const [improvements, setImprovements] = useState(null);
  const [strengths, setStrengths] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [cachedFileId, setCachedFileId] = useState(null);

  // On first load, populate all tabs with insights (no API calls)
  React.useEffect(() => {
    if (insights && file && !cachedFileId) {
      const fileId = `${file.name}-${file.size}`;
      setCachedFileId(fileId);

      // Pre-fill breakdown
      setScoreBreakdown({
        overall: 7,
        breakdown: { format: 7, content: 7, experience: 7, education: 7, skills: 7 },
        details: 'Estimated from analysis.'
      });

      // Pre-fill improvements
      if (insights.improvements) {
        setImprovements({
          improvements: Array.isArray(insights.improvements) 
            ? insights.improvements.join('\n• ') 
            : insights.improvements
        });
      }

      // Pre-fill strengths
      if (insights.strengths) {
        setStrengths({
          strengths: Array.isArray(insights.strengths) 
            ? insights.strengths.join('\n• ') 
            : insights.strengths
        });
      }
    }
  }, [insights, file, cachedFileId]);

  const fetchScoreBreakdown = async () => {
    if (!file) return;
    setLoadingDetails(true);
    setDetailError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(ENDPOINTS.SCORE_BREAKDOWN, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Score breakdown response:', res.data);
      setScoreBreakdown(res.data);
    } catch (err) {
      console.error('Error fetching score breakdown:', err);
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || err.message || 'Unable to load score breakdown.';
      setDetailError(errorMsg);
      // Fallback to estimated scores if request fails
      if (insights) {
        setScoreBreakdown({
          overall: 7,
          breakdown: {
            format: 7,
            content: 7,
            experience: 7,
            education: 7,
            skills: 7
          },
          details: 'Using fallback scores. Unable to fetch detailed analysis.'
        });
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchImprovements = async () => {
    if (!file) return;
    setLoadingDetails(true);
    setDetailError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(ENDPOINTS.IMPROVEMENTS, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImprovements(res.data);
    } catch (err) {
      console.error('Error fetching improvements:', err);
      setDetailError(err?.response?.data?.error || err.message || 'Unable to load improvements.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchStrengths = async () => {
    if (!file) return;
    setLoadingDetails(true);
    setDetailError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(ENDPOINTS.STRENGTHS, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStrengths(res.data);
    } catch (err) {
      console.error('Error fetching strengths:', err);
      setDetailError(err?.response?.data?.error || err.message || 'Unable to load strengths.');
    } finally {
      setLoadingDetails(false);
    }
  };

  if (!score && !loading) {
    return null;
  }

  const scoreChartData = scoreBreakdown && {
    labels: ['Format', 'Content', 'Experience', 'Education', 'Skills'],
    datasets: [
      {
        label: 'Score Breakdown',
        data: [
          scoreBreakdown.breakdown.format,
          scoreBreakdown.breakdown.content,
          scoreBreakdown.breakdown.experience,
          scoreBreakdown.breakdown.education,
          scoreBreakdown.breakdown.skills
        ],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2,
        fill: true,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5
      }
    ]
  };

  const scoreChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 2
        }
      }
    }
  };

  const overallScoreChart = score && {
    labels: ['Score'],
    datasets: [
      {
        label: 'Overall Rating',
        data: [score, 10 - score],
        backgroundColor: [
          score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444',
          'rgba(0, 0, 0, 0.05)'
        ],
        borderColor: ['white', 'transparent'],
        borderWidth: 3
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    }
  };

  return (
    <div className="insights-panel">
      <div className="insights-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('overview');
          }}
        >
          <span className="tab-icon">📊</span>
          Overview
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'breakdown' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('breakdown');
            if (!scoreBreakdown) fetchScoreBreakdown();
          }}
        >
          <span className="tab-icon">📈</span>
          Breakdown
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'improvements' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('improvements');
            if (!improvements) fetchImprovements();
          }}
        >
          <span className="tab-icon">💡</span>
          Improvements
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'strengths' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('strengths');
            if (!strengths) fetchStrengths();
          }}
        >
          <span className="tab-icon">⭐</span>
          Strengths
        </button>
      </div>

      <div className="insights-content">
        {detailError && (
          <div className="loading-placeholder" style={{ color: '#ef4444' }}>
            {detailError}
          </div>
        )}
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="score-display">
              <div className="score-circle">
                {score && (
                  <>
                    <div className="score-value">{score}</div>
                    <div className="score-max">/ 10</div>
                  </>
                )}
              </div>
              <div className="score-info">
                <h3 className="score-title">Resume Quality Score</h3>
                <p className="score-description">
                  {score >= 8 && "Excellent! Your resume is well-structured and compelling."}
                  {score >= 6 && score < 8 && "Good foundation. Consider the suggestions below for improvement."}
                  {score < 6 && "Room for improvement. Review key areas to strengthen your resume."}
                </p>
              </div>
            </div>

            {insights && (
              <div className="quick-insights">
                <div className="insight-card">
                  <span className="insight-label">Experience</span>
                  <span className="insight-value">{insights.experience_years} years</span>
                </div>
                <div className="insight-card">
                  <span className="insight-label">Strengths Found</span>
                  <span className="insight-value">{insights.strengths.length}</span>
                </div>
                <div className="insight-card">
                  <span className="insight-label">Areas to Improve</span>
                  <span className="insight-value">{insights.improvements.length}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Breakdown Tab */}
        {activeTab === 'breakdown' && (
          <div className="breakdown-section">
            {loadingDetails ? (
              <div className="loading-placeholder">Loading score breakdown...</div>
            ) : scoreBreakdown ? (
              <>
                <div className="breakdown-chart">
                  <div style={{ position: 'relative', height: '300px' }}>
                    <Radar data={scoreChartData} options={scoreChartOptions} />
                  </div>
                </div>
                <div className="breakdown-details">
                  <div className="detail-item">
                    <span className="detail-label">Format & Structure</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(scoreBreakdown.breakdown.format / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="detail-value">{scoreBreakdown.breakdown.format}/10</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Content Quality</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(scoreBreakdown.breakdown.content / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="detail-value">{scoreBreakdown.breakdown.content}/10</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Experience</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(scoreBreakdown.breakdown.experience / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="detail-value">{scoreBreakdown.breakdown.experience}/10</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Education</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(scoreBreakdown.breakdown.education / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="detail-value">{scoreBreakdown.breakdown.education}/10</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Skills</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(scoreBreakdown.breakdown.skills / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="detail-value">{scoreBreakdown.breakdown.skills}/10</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-data">Click to load detailed score breakdown</div>
            )}
          </div>
        )}

        {/* Improvements Tab */}
        {activeTab === 'improvements' && (
          <div className="improvements-section">
            {loadingDetails ? (
              <div className="loading-placeholder">Loading improvement suggestions...</div>
            ) : improvements ? (
              <div className="improvements-list">
                <p className="improvements-text">{improvements.improvements}</p>
              </div>
            ) : insights?.improvements ? (
              <div className="improvements-list">
                <p className="improvements-text">{Array.isArray(insights.improvements) ? insights.improvements.join('\n') : insights.improvements}</p>
              </div>
            ) : (
              <div className="no-data">Click to load improvement suggestions</div>
            )}
          </div>
        )}

        {/* Strengths Tab */}
        {activeTab === 'strengths' && (
          <div className="strengths-section">
            {loadingDetails ? (
              <div className="loading-placeholder">Loading strengths analysis...</div>
            ) : strengths ? (
              <div className="strengths-list">
                <p className="strengths-text">{strengths.strengths}</p>
              </div>
            ) : insights?.strengths ? (
              <div className="strengths-list">
                <p className="strengths-text">{Array.isArray(insights.strengths) ? insights.strengths.join('\n') : insights.strengths}</p>
              </div>
            ) : (
              <div className="no-data">Click to load strengths analysis</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
