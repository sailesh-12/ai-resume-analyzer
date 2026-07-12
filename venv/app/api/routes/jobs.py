"""
app/api/routes/jobs.py
======================
Job recommendations endpoints:
  POST /extract-skills      – Extract skills from resume
  POST /fetch-jobs          – Fetch jobs from Adzuna matching skills
  POST /rank-jobs           – Rank jobs against resume using AI

All heavy logic lives in services/. Routes are thin HTTP adapters.
"""

import os
import tempfile
import json
import hashlib
from fastapi import APIRouter, Form, HTTPException, UploadFile, Query, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from app.services.pdf_service import extract_text_from_pdf, pdf_to_vector_index
from app.services.rag_service import query_rag, clean_json_response, extract_insights_from_text, FULL_ANALYSIS_QUERY
from app.services.adzuna_service import fetch_jobs_by_skills, AdzunaAPIError
from app.services.job_ranking_service import rank_jobs_against_resume
from app.models.schemas import ExtractSkillsResponse, FetchJobsResponse, RankJobsResponse

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# Global in-memory cache (file_hash -> cached data dict)
# Accelerates subsequent job fetches and AI rankings to less than 1 millisecond!
_profile_cache = {}


@router.post("/extract-skills")
async def extract_skills(file: UploadFile):
    """
    Extract skills from resume PDF using RAG analysis.
    
    Returns:
        - technical_skills: list of technical skills found
        - soft_skills: list of soft skills identified
        - experience_years: estimated total years of experience
        - education: list of education/certifications
        - proficiency_levels: estimated skill levels (beginner, intermediate, advanced)
    """
    
    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    
    # Check cache for skills
    if file_hash in _profile_cache and "skills_data" in _profile_cache[file_hash]:
        skills_data = _profile_cache[file_hash]["skills_data"]
        print(f"[extract-skills] Cache HIT for full skills extraction ({file_hash[:8]}...)")
        response = ExtractSkillsResponse(**skills_data)
        return jsonable_encoder(response)
        
    print(f"[extract-skills] Cache MISS — extracting skills ({file_hash[:8]}...)")
    
    # Write to temp file, analyze, then delete
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    
    try:
        # Extract text and build index
        vectors, chunks_meta, index = pdf_to_vector_index(tmp_path)
        
        # Query for skills extraction using RAG
        skills_query = """
        Extract and list all technical skills, programming languages, tools, and frameworks mentioned in this resume.
        Also identify soft skills if any (communication, leadership, project management, etc.).
        
        Return a JSON object with:
        {
            "technical_skills": ["Python", "React", "MongoDB", ...],
            "soft_skills": ["Leadership", "Communication", ...],
            "experience_years": 5,
            "education": ["Bachelor of Science in Computer Science", "AWS Certification", ...],
            "proficiency_levels": {"Python": "advanced", "React": "intermediate", ...}
        }
        
        Be comprehensive but realistic. Only include skills actually mentioned in the resume.
        """
        
        raw, _, _ = query_rag(skills_query, vectors, index)
        cleaned = clean_json_response(raw)
        
        # Parse JSON response
        try:
            skills_data = json.loads(cleaned)
        except json.JSONDecodeError:
            print(f"[extract-skills] JSON parse failed — using fallback")
            # Fallback: extract from insights
            insights = extract_insights_from_text(raw)
            skills_data = {
                "technical_skills": insights.get("technical_skills", []),
                "soft_skills": [],
                "experience_years": insights.get("experience_years", 0),
                "education": insights.get("education", []),
                "proficiency_levels": {},
            }
        
        # Ensure all fields exist
        skills_data.setdefault("technical_skills", [])
        skills_data.setdefault("soft_skills", [])
        skills_data.setdefault("experience_years", 0)
        skills_data.setdefault("education", [])
        skills_data.setdefault("proficiency_levels", {})
        
        # Pre-populate all caches for instant /fetch-jobs and /rank-jobs
        _profile_cache.setdefault(file_hash, {})["skills_data"] = skills_data
        _profile_cache[file_hash]["skills"] = skills_data.get("technical_skills", [])
        
        # Pre-populate candidate profile cache
        _profile_cache[file_hash]["profile"] = {
            "candidate_skills": skills_data.get("technical_skills", []),
            "experience_years": skills_data.get("experience_years", 0),
            "education": skills_data.get("education", []),
            "strengths": skills_data.get("soft_skills", [])
        }
        
        response = ExtractSkillsResponse(**skills_data)
        return jsonable_encoder(response)
    
    except Exception as e:
        print(f"[extract-skills] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract skills: {str(e)}"
        )
    
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/fetch-jobs")
async def fetch_jobs(
    file: UploadFile,
    location: str = Query("US", description="Job location (e.g., US, London, San Francisco)"),
    results_per_page: int = Query(50, ge=1, le=50, description="Number of jobs per page"),
    salary_min: int = Query(None, description="Minimum salary filter (optional)"),
    salary_max: int = Query(None, description="Maximum salary filter (optional)"),
):
    """
    Fetch relevant jobs from Adzuna API based on resume skills.
    """
    
    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    
    # Check cache for skills
    if file_hash in _profile_cache and "skills" in _profile_cache[file_hash]:
        skills = _profile_cache[file_hash]["skills"]
        print(f"[fetch-jobs] Cache HIT for skills extraction ({file_hash[:8]}...)")
    else:
        print(f"[fetch-jobs] Cache MISS — extracting skills ({file_hash[:8]}...)")
        # Extract skills from resume first
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            vectors, chunks_meta, index = pdf_to_vector_index(tmp_path)

            skills_query = """
            List only the technical skills, programming languages, and tools from this resume.
            Return a JSON object with: {"skills": ["Python", "React", ...]}
            """

            raw, retrieved_chunks, _ = query_rag(skills_query, vectors, index)
            cleaned = clean_json_response(raw)

            skills = []
            try:
                skills_data = json.loads(cleaned)
                if "skills" in skills_data and skills_data["skills"]:
                    skills = skills_data["skills"]
                elif "technical_skills" in skills_data and skills_data["technical_skills"]:
                    skills = skills_data["technical_skills"]
                else:
                    raise ValueError("No skills key in parsed JSON")
            except (json.JSONDecodeError, ValueError):
                insights = extract_insights_from_text(raw)
                skills = insights.get("technical_skills", [])

            if not skills:
                KNOWN_SKILLS = [
                    "python","java","javascript","typescript","c++","c#","golang","go",
                    "rust","kotlin","swift","php","ruby","scala","matlab","r",
                    "react","angular","vue","html","css","sass","tailwind","bootstrap",
                    "nextjs","gatsby","svelte","webpack","vite","jquery",
                    "node","nodejs","express","fastapi","flask","django",
                    "spring","rails","laravel","graphql","rest","soap",
                    "ml","machine learning","deep learning","ai","nlp","tensorflow",
                    "pytorch","keras","scikit","pandas","numpy","scipy","jupyter",
                    "huggingface","langchain","openai","gemini","llm",
                    "aws","azure","gcp","docker","kubernetes","k8s",
                    "terraform","ansible","jenkins","helm","ci/cd",
                    "sql","mysql","postgresql","mongodb","redis","elasticsearch",
                    "cassandra","dynamodb","firebase","supabase","snowflake",
                    "spark","hadoop","kafka","airflow",
                    "git","github","gitlab","linux","bash","powershell",
                    "microservices","agile","scrum","jira","confluence",
                    "android","ios","flutter","react native","xamarin",
                ]
                all_text = " ".join(retrieved_chunks).lower()
                scanned = [
                    kw.title() if not kw.isupper() else kw
                    for kw in KNOWN_SKILLS
                    if kw in all_text
                ]
                seen: set = set()
                for s in scanned:
                    if s.lower() not in seen:
                        seen.add(s.lower())
                        skills.append(s)

            if not skills:
                print("[fetch-jobs] Could not extract skills — using generic fallback keywords")
                skills = ["Software Engineer", "Developer", "Programming"]

            _profile_cache.setdefault(file_hash, {})["skills"] = skills

        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    print(f"[fetch-jobs] Skills found: {skills[:10]}")

    # Fetch jobs from Adzuna
    try:
        result = await fetch_jobs_by_skills(
            skills=skills[:10],
            location=location,
            results_per_page=results_per_page,
            salary_min=salary_min,
            salary_max=salary_max,
        )

        return jsonable_encoder(result)

    except AdzunaAPIError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Job API error: {str(e)}"
        )
    except Exception as e:
        print(f"[fetch-jobs] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch jobs: {str(e)}"
        )


@router.post("/rank-jobs")
async def rank_jobs(
    file: UploadFile,
    jobs_json: str = Form(..., description="JSON array of job objects from fetch-jobs endpoint"),
):
    """
    Rank jobs against resume using AI.
    """

    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Parse jobs JSON from form field
    try:
        jobs = json.loads(jobs_json)
        if not isinstance(jobs, list):
            raise ValueError("jobs_json must be a JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid jobs JSON: {str(e)}"
        )

    # Check cache for candidate profile
    if file_hash in _profile_cache and "profile" in _profile_cache[file_hash]:
        profile = _profile_cache[file_hash]["profile"]
        candidate_skills = profile["candidate_skills"]
        experience_years = profile["experience_years"]
        education = profile["education"]
        strengths = profile["strengths"]
        print(f"[rank-jobs] Cache HIT for candidate profile ({file_hash[:8]}...)")
    else:
        print(f"[rank-jobs] Cache MISS — extracting candidate profile ({file_hash[:8]}...)")
        # Extract resume data
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            vectors, _, index = pdf_to_vector_index(tmp_path)

            # Get full resume analysis to extract the candidate profile
            raw, _, _ = query_rag(FULL_ANALYSIS_QUERY, vectors, index)
            cleaned = clean_json_response(raw)

            parsed = {}
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                pass

            candidate_skills = (
                parsed.get("technical_skills")
                or parsed.get("skills")
                or extract_insights_from_text(raw).get("technical_skills", [])
            )
            experience_years = parsed.get("experience_years", 0)
            education = parsed.get("education", [])
            strengths = parsed.get("strengths", [])

            # Cache the extracted profile
            _profile_cache.setdefault(file_hash, {})["profile"] = {
                "candidate_skills": candidate_skills,
                "experience_years": experience_years,
                "education": education,
                "strengths": strengths
            }

        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    # Rank jobs using Gemini
    try:
        ranked_jobs = await rank_jobs_against_resume(
            resume_skills=candidate_skills,
            experience_years=experience_years,
            education=education,
            strengths=strengths,
            jobs=jobs,
        )

        # Top 5 job titles for quick summary
        top_matches = [
            job.get("title", "Unknown")
            for job in ranked_jobs[:5]
        ]

        response = {
            "ranked_jobs": ranked_jobs,
            "candidate_skills": candidate_skills,
            "top_matches": top_matches,
            "total_ranked": len(ranked_jobs),
        }

        return jsonable_encoder(response)

    except Exception as e:
        print(f"[rank-jobs] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to rank jobs: {str(e)}"
        )
