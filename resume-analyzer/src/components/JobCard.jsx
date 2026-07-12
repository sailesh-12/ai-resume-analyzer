/**
 * components/JobCard.jsx
 * 
 * Individual job listing card with match score, skills, and CTA.
 * Props:
 *   - job: job object with title, company, salary, location, ranking, etc.
 *   - onApply: callback when "Apply Now" is clicked
 *   - highlighted: boolean to highlight best matches
 */

import { Badge } from './ui/Badge';
import './JobCard.css';

export default function JobCard({ job, onApply, highlighted = false }) {
  const {
    title,
    company,
    location,
    salary_range,
    job_type,
    url,
    matched_skills,
    skills_match_percentage,
    ranking = {},
    posted_relative,
  } = job;

  const matchScore = ranking?.match_score ?? 0;
  const recommendation = ranking?.recommendation ?? 'Possible Fit';
  const matchedSkills = ranking?.matched_skills ?? matched_skills ?? [];
  const missingSkills = ranking?.missing_skills ?? [];

  // Color based on match score
  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'danger';
  };

  const handleApply = () => {
    if (url) {
      window.open(url, '_blank');
    }
    if (onApply) {
      onApply(job);
    }
  };

  return (
    <div className={`job-card ${highlighted ? 'job-card--highlighted' : ''}`}>
      {/* Header: Title, Company, Score */}
      <div className="job-card__header">
        <div className="job-card__title-group">
          <h3 className="job-card__title">{title}</h3>
          <p className="job-card__company">{company}</p>
        </div>
        
        <div className="job-card__score">
          <div className={`job-card__badge job-card__badge--${getScoreColor(matchScore)}`}>
            {matchScore}%
          </div>
          <span className="job-card__recommendation">{recommendation}</span>
        </div>
      </div>

      {/* Meta: Location, Job Type, Posted */}
      <div className="job-card__meta">
        <span className="job-card__meta-item">📍 {location?.display_name || 'Remote'}</span>
        <span className="job-card__meta-item">💼 {job_type}</span>
        <span className="job-card__meta-item">🕐 {posted_relative}</span>
      </div>

      {/* Salary */}
      {salary_range && (
        <div className="job-card__salary">
          💰 {salary_range}
        </div>
      )}

      {/* Skills Match */}
      <div className="job-card__skills">
        <div className="job-card__skills-section">
          <h4 className="job-card__skills-title">✓ Your Skills</h4>
          <div className="job-card__skill-tags">
            {matchedSkills.length > 0 ? (
              matchedSkills.slice(0, 5).map((skill) => (
                <Badge key={skill} variant="success" className="job-card__skill-tag">
                  {skill}
                </Badge>
              ))
            ) : (
              <span className="job-card__no-skills">No matching skills found</span>
            )}
            {matchedSkills.length > 5 && (
              <Badge variant="info" className="job-card__skill-tag">
                +{matchedSkills.length - 5} more
              </Badge>
            )}
          </div>
        </div>

        {missingSkills.length > 0 && (
          <div className="job-card__skills-section">
            <h4 className="job-card__skills-title">📚 Learn These</h4>
            <div className="job-card__skill-tags">
              {missingSkills.slice(0, 4).map((skill) => (
                <Badge key={skill} variant="warning" className="job-card__skill-tag">
                  {skill}
                </Badge>
              ))}
              {missingSkills.length > 4 && (
                <Badge variant="warning" className="job-card__skill-tag">
                  +{missingSkills.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ranking Insights */}
      {ranking?.alignment_reasons && ranking.alignment_reasons.length > 0 && (
        <div className="job-card__insights">
          <h4 className="job-card__insights-title">Why This Fit</h4>
          <ul className="job-card__insights-list">
            {ranking.alignment_reasons.slice(0, 2).map((reason, idx) => (
              <li key={idx} className="job-card__insight-item">{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <div className="job-card__footer">
        <button 
          className="job-card__apply-btn" 
          onClick={handleApply}
          aria-label={`Apply for ${title} at ${company}`}
        >
          Apply Now →
        </button>
      </div>
    </div>
  );
}
