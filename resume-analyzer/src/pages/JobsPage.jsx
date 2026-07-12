/**
 * pages/JobsPage.jsx
 *
 * Recommended jobs dashboard.
 * Flow: Use existing resume from AnalysisContext OR upload a new one
 *       → Extract skills → Fetch jobs → Rank jobs → Display results
 *
 * If the user already analyzed a resume on the Results page, the file is
 * already in AnalysisContext and the jobs flow starts automatically.
 */

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import JobCard from '../components/JobCard';
import FileUploader from '../components/FileUploader';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { extractSkills, fetchJobs, rankJobs, extractErrorMessage } from '../services/jobsService';
import { ROUTES } from '../constants/routes';
import './JobsPage.css';

export default function JobsPage() {
  const { file: contextFile } = useAnalysis();
  const navigate = useNavigate();

  const [stage, setStage] = useState('upload'); // 'upload' | 'extracting' | 'fetching' | 'ranking' | 'results'
  const [file, setFile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [rankedJobs, setRankedJobs] = useState([]);
  const [filters, setFilters] = useState({ location: 'US' });
  const [sortBy, setSortBy] = useState('match'); // 'match' | 'salary' | 'date'
  const [loading, setLoading] = useState(false);

  // If user already uploaded a resume on the main analysis page, auto-start with it.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (contextFile && !autoStarted.current && stage === 'upload') {
      autoStarted.current = true;
      setFile(contextFile);
      handleRunFullFlow(contextFile);
    }
  }, [contextFile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Full pipeline ────────────────────────────────────────────────────────

  const handleRunFullFlow = async (resumeFile) => {
    if (!resumeFile) return;
    try {
      // Step 1: extract skills
      setStage('extracting');
      setLoading(true);
      const skillsData = await extractSkills(resumeFile);
      const extracted = skillsData.technical_skills || [];
      setSkills(extracted);
      toast.success(`✓ Found ${extracted.length} skills in your resume`);

      // Step 2: fetch jobs
      setStage('fetching');
      const jobsData = await fetchJobs(resumeFile, {
        location: filters.location,
        results_per_page: 20,
      });
      const fetchedJobs = jobsData.jobs || [];
      setJobs(fetchedJobs);
      toast.success(`✓ Found ${fetchedJobs.length} matching jobs`);

      // Step 3: rank jobs (cap at 10 to avoid Gemini rate limits)
      setStage('ranking');
      const jobsToRank = fetchedJobs.slice(0, 10);
      const rankingData = await rankJobs(resumeFile, jobsToRank);
      setRankedJobs(rankingData.ranked_jobs || []);
      setStage('results');
      toast.success(`✓ AI ranked ${rankingData.total_ranked || 0} jobs for you`);
    } catch (error) {
      const msg = extractErrorMessage(error);
      toast.error(`Jobs search failed: ${msg}`);
      setStage(file ? 'upload' : 'upload');
    } finally {
      setLoading(false);
    }
  };

  // Called when user manually uploads a new file on this page
  const handleFileSelected = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    autoStarted.current = true;
    handleRunFullFlow(selectedFile);
  };

  const handleReset = () => {
    setStage('upload');
    setFile(null);
    setSkills([]);
    setJobs([]);
    setRankedJobs([]);
    autoStarted.current = false;
  };

  // ─── Filter & sort ────────────────────────────────────────────────────────

  const getFilteredJobs = () => {
    let filtered = rankedJobs.filter((job) => {
      const ranking = job.ranking || {};
      const rec = ranking.recommendation || '';
      
      // List only jobs that match skills/experience (exclude Stretch Goals)
      return rec.toLowerCase() !== 'stretch goal';
    });
    filtered.sort((a, b) => {
      if (sortBy === 'match')  return (b.ranking?.match_score ?? 0) - (a.ranking?.match_score ?? 0);
      if (sortBy === 'salary') return (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0);
      if (sortBy === 'date')   return new Date(b.posted_date) - new Date(a.posted_date);
      return 0;
    });
    return filtered;
  };

  const filteredJobs = getFilteredJobs();
  const topMatches   = filteredJobs.slice(0, 3);

  // ─── Loading message ──────────────────────────────────────────────────────

  const loadingMessage = {
    extracting: '🔍 Extracting your skills from resume…',
    fetching:   '🌐 Fetching matching jobs from Adzuna…',
    ranking:    '🤖 AI is ranking jobs against your profile…',
  }[stage] || 'Working…';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="jobs-page">
      <div className="jobs-page__container">

        {/* Header */}
        <div className="jobs-page__header">
          <div>
            <h1 className="jobs-page__title">💼 Recommended Jobs</h1>
            <p className="jobs-page__subtitle">
              {contextFile && stage === 'upload'
                ? 'Starting job search with your analyzed resume…'
                : 'Discover AI-matched job opportunities based on your resume'}
            </p>
          </div>
          {stage === 'results' && (
            <button className="jobs-page__reset-btn" onClick={handleReset}>
              ⬅ Try a Different Resume
            </button>
          )}
        </div>

        {/* Upload stage — only shown if no context file and not started yet */}
        {stage === 'upload' && !loading && (
          <Card className="jobs-page__card">
            <Card.Header
              title={contextFile ? '🔄 Resume Detected' : '📄 Upload Your Resume'}
              subtitle={
                contextFile
                  ? 'Your previously analyzed resume will be used automatically.'
                  : 'Upload your resume PDF to find AI-matched job opportunities.'
              }
            />
            <Card.Body>
              {contextFile ? (
                <div className="jobs-page__detected">
                  <div className="jobs-page__detected-file">
                    <span className="jobs-page__detected-icon">📄</span>
                    <div>
                      <strong>{contextFile.name}</strong>
                      <p>Click below to search jobs with this resume.</p>
                    </div>
                  </div>
                  <div className="jobs-page__detected-actions">
                    <button
                      className="jobs-page__start-btn"
                      onClick={() => {
                        setFile(contextFile);
                        autoStarted.current = true;
                        handleRunFullFlow(contextFile);
                      }}
                    >
                      🚀 Find Jobs with This Resume
                    </button>
                    <button
                      className="jobs-page__secondary-btn"
                      onClick={() => { autoStarted.current = true; }}
                    >
                      Or upload a different resume below
                    </button>
                  </div>
                  <FileUploader onFileSelected={handleFileSelected} />
                </div>
              ) : (
                <FileUploader onFileSelected={handleFileSelected} />
              )}
            </Card.Body>
          </Card>
        )}

        {/* Loading state */}
        {loading && (
          <Card className="jobs-page__card jobs-page__card--loading">
            <Card.Body>
              <div className="jobs-page__loading">
                <Spinner />
                <p className="jobs-page__loading-text">{loadingMessage}</p>
                <p className="jobs-page__loading-sub">
                  {stage === 'ranking'
                    ? 'This may take 20–40 seconds while AI evaluates each job…'
                    : 'Usually takes 10–20 seconds…'}
                </p>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Results */}
        {!loading && stage === 'results' && (
          <>
            {/* Skills summary */}
            {skills.length > 0 && (
              <Card className="jobs-page__card jobs-page__skills-card">
                <Card.Header title="📊 Skills Detected in Your Resume" />
                <Card.Body>
                  <div className="jobs-page__skills-list">
                    {skills.slice(0, 12).map((skill) => (
                      <Badge key={skill} variant="info">{skill}</Badge>
                    ))}
                    {skills.length > 12 && (
                      <Badge variant="default">+{skills.length - 12} more</Badge>
                    )}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Top matches */}
            {topMatches.length > 0 && (
              <Card className="jobs-page__card">
                <Card.Header
                  title="⭐ Top Matches"
                  subtitle={`Best ${topMatches.length} opportunities for your profile`}
                />
                <Card.Body>
                  <div className="jobs-page__top-matches">
                    {topMatches.map((job) => (
                      <JobCard key={job.id} job={job} highlighted />
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Filters & sort */}
            <Card className="jobs-page__card">
              <Card.Body className="jobs-page__controls">
                <div className="jobs-page__filter-group">
                  <label className="jobs-page__label">Sort By:</label>
                  <div className="jobs-page__sort-buttons">
                    {[
                      { key: 'match',  label: '🎯 Match'  },
                      { key: 'salary', label: '💰 Salary' },
                      { key: 'date',   label: '📅 Recent' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        className={`jobs-page__sort-btn ${sortBy === key ? 'jobs-page__sort-btn--active' : ''}`}
                        onClick={() => setSortBy(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* All jobs list */}
            <Card className="jobs-page__card">
              <Card.Header
                title="All Opportunities"
                subtitle={`${filteredJobs.length} job${filteredJobs.length !== 1 ? 's' : ''} match your profile`}
              />
              <Card.Body>
                {filteredJobs.length > 0 ? (
                  <div className="jobs-page__jobs-list">
                    {filteredJobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="🔍"
                    title="No Matches Found"
                    description="No jobs match both your skills and experience level. Try searching with a different resume."
                  />
                )}
              </Card.Body>
            </Card>

            {/* Back to analysis */}
            <div className="jobs-page__footer-actions">
              <button
                className="jobs-page__secondary-btn"
                onClick={() => navigate(ROUTES.RESULTS)}
              >
                ← Back to Resume Analysis
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
