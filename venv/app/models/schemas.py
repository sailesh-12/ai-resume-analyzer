"""
app/models/schemas.py
=====================
Pydantic request/response models.
Single source of truth for all API data shapes.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


# ─── Auth ─────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    username: str    = Field(..., min_length=2, max_length=50)
    email:    EmailStr
    password: str    = Field(..., min_length=6)
    date_of_birth: str


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"


# ─── Analysis ─────────────────────────────────────────────────────────────────

class InsightsPayload(BaseModel):
    strengths:        list[str] = []
    improvements:     list[str] = []
    technical_skills: list[str] = []
    experience_years: int       = 0
    education:        list[str] = []
    format_score:     int       = 7


class AnalysisResponse(BaseModel):
    answer:           str
    score:            int
    insights:         InsightsPayload
    retrieved_chunks: list[str] = []
    distances:        list[float] = []


class ScoreBreakdownResponse(BaseModel):
    overall:   int
    breakdown: dict[str, int]
    details:   str


class ImprovementsResponse(BaseModel):
    improvements:  str
    priority_areas: dict


class StrengthsResponse(BaseModel):
    strengths:  str
    highlights: dict


class MetricsResponse(BaseModel):
    pages:                int
    chunks:               int
    total_content_length: int
    details:              str


# ─── Jobs & Skills ───────────────────────────────────────────────────────────

class ExtractSkillsRequest(BaseModel):
    """Request to extract skills from resume"""
    pass  # File will be in multipart form


class ExtractSkillsResponse(BaseModel):
    technical_skills: list[str]
    soft_skills: list[str] = []
    experience_years: int
    education: list[str]
    proficiency_levels: dict[str, str] = {}  # skill -> "beginner|intermediate|advanced"


class JobLocation(BaseModel):
    display_name: str
    area: list[str] = []


class JobRanking(BaseModel):
    match_score: int  # 0-100
    skill_match_score: int
    experience_fit: int
    matched_skills: list[str]
    missing_skills: list[str]
    growth_opportunities: list[str]
    alignment_reasons: list[str]
    concerns: list[str] = []
    recommendation: str  # "Strong Fit" | "Good Fit" | "Possible Fit" | "Stretch Goal"


class JobListing(BaseModel):
    id: str
    title: str
    company: str
    location: JobLocation
    description: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_range: str = ""
    currency: str = "USD"
    job_type: str = "Permanent"
    url: str
    posted_date: str
    posted_relative: str
    matched_skills: list[str] = []
    skills_match_percentage: float = 0.0
    source: str = "adzuna"
    ranking: Optional[JobRanking] = None


class FetchJobsResponse(BaseModel):
    jobs: list[JobListing]
    total: int
    page: int
    results_returned: int
    location: str
    skills_searched: list[str]


class RankJobsRequest(BaseModel):
    """Request to rank jobs against resume"""
    pass  # File will be in multipart form


class RankJobsResponse(BaseModel):
    ranked_jobs: list[JobListing]
    candidate_skills: list[str]
    top_matches: list[str]  # Top 3-5 job titles
    total_ranked: int
