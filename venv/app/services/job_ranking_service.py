"""
app/services/job_ranking_service.py
===================================
AI-powered job ranking engine using Gemini.
Ranks jobs against candidate resume using semantic matching and skill analysis.
"""

import json
import google.generativeai as genai
from typing import Optional
from app.core.config import settings

# Configure Gemini once at import time
genai.configure(api_key=settings.GEMINI_API_KEY)

BATCH_RANKING_PROMPT = """
You are a hiring and recruitment expert with 15+ years of experience.
Analyze how well a list of job postings matches a candidate's resume profile.

CANDIDATE PROFILE:
- Skills: {skills}
- Experience Years: {experience_years}
- Education: {education}
- Key Strengths: {strengths}

JOB LIST TO EVALUATE:
{jobs_list_formatted}

For EACH job in the list, evaluate its fit and return a JSON array containing the ranking analysis.
The response MUST be a single JSON object with the key "ranked_jobs" mapping to an array of objects.
Each object in the array must correspond to one of the evaluated jobs (by its ID) and contain the following fields:
1. id (string/number): The exact job ID passed in the input
2. match_score (integer 0-100): Overall fit percentage
3. skill_match_score (integer 0-100): How well candidate skills align with the job requirements
4. experience_fit (integer 0-100): Score for experience level fit (0-100)
5. matched_skills (array of strings): Candidate skills that are relevant to or mentioned in this job description
6. missing_skills (array of strings): Critical job requirements that the candidate does not have
7. growth_opportunities (array of strings): Skills candidate can develop to succeed in this role
8. alignment_reasons (array of strings): Top 3 reasons this job is a good fit for this candidate
9. concerns (array of strings): Any potential gaps, mismatches, or concerns
10. recommendation (string): One of: "Strong Fit" | "Good Fit" | "Possible Fit" | "Stretch Goal"

Return ONLY a valid, parseable JSON object matching this structure.
CRITICAL JSON COMPLIANCE:
1. Do NOT use unescaped double quotes inside string fields (e.g. use single quotes instead).
2. Ensure there are no trailing commas in arrays or objects.
3. Ensure every element is separated by a comma.
4. Do not include markdown fences, extra text, or preamble.
"""


def repair_json_quotes(json_str: str) -> str:
    """
    Repair unescaped double quotes inside JSON string values.
    Also removes trailing commas.
    """
    import re
    # Remove trailing commas before closing braces/brackets
    json_str = re.sub(r',\s*\}', '}', json_str)
    json_str = re.sub(r',\s*\]', ']', json_str)

    chars = list(json_str)
    in_string = False
    escape = False
    
    for i in range(len(chars)):
        char = chars[i]
        if escape:
            escape = False
            continue
        if char == '\\':
            escape = True
            continue
        if char == '"':
            if in_string:
                # We are inside a string. Is this quote the end of the string?
                # Look ahead to see if a structural char follows (ignoring whitespace)
                lookahead = "".join(chars[i+1:i+20]).strip()
                if lookahead.startswith(',') or lookahead.startswith('}') or lookahead.startswith(']') or lookahead.startswith(':'):
                    in_string = False
                else:
                    # Unescaped quote inside string — escape it
                    chars[i] = '\\"'
            else:
                in_string = True
                
    return "".join(chars)


async def rank_jobs_against_resume(
    resume_skills: list[str],
    experience_years: int,
    education: list[str],
    strengths: list[str],
    jobs: list[dict],
) -> list[dict]:
    """
    Rank a list of jobs against candidate resume using a single batched Gemini AI call.
    Ensures complete resilience against free-tier API rate limits.
    
    Args:
        resume_skills: List of skills extracted from resume
        experience_years: Total years of experience
        education: List of education/qualifications
        strengths: Key strengths from resume analysis
        jobs: List of job objects (from Adzuna or similar)
    
    Returns:
        List of jobs with ranking scores and analysis, sorted by match_score DESC
    """
    
    if not jobs:
        return []
        
    # Format the list of jobs compactly for a single batch prompt
    jobs_to_send = []
    for i, job in enumerate(jobs):
        job_id = str(job.get("id") or f"job_{i}")
        job_title = job.get("title", "Unknown Role")
        job_desc = job.get("description", "")[:800]  # Limit to 800 characters to keep context clean
        jobs_to_send.append(
            f"--- JOB ID: {job_id} ---\n"
            f"Title: {job_title}\n"
            f"Description: {job_desc}\n"
        )
        
    jobs_list_formatted = "\n".join(jobs_to_send)
    
    # Build batch prompt
    prompt = BATCH_RANKING_PROMPT.format(
        skills=", ".join(resume_skills[:10]),  # Limit to top 10 skills
        experience_years=experience_years,
        education=", ".join(education[:3]),  # Limit to 3 items
        strengths=", ".join(strengths[:3]),  # Limit to 3 strengths
        jobs_list_formatted=jobs_list_formatted,
    )
    
    # Query Gemini
    ranked_results = {}
    try:
        print(f"[job-ranking] Batch ranking {len(jobs)} jobs in a single call...")
        model = genai.GenerativeModel(settings.GEMINI_CHAT_MODEL)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,  # Consistent, high-fidelity matching
                max_output_tokens=8000,
                response_mime_type="application/json",
            ),
        )
        
        response_text = response.text.strip()
        
        # Parse JSON response
        try:
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0]
            else:
                json_str = response_text
                
            json_str = json_str.strip()
            try:
                data = json.loads(json_str)
            except json.JSONDecodeError as initial_err:
                print(f"[job-ranking] Initial JSON parse failed ({initial_err}), attempting repair...")
                try:
                    repaired_str = repair_json_quotes(json_str)
                    data = json.loads(repaired_str)
                    print("[job-ranking] JSON successfully repaired and parsed!")
                except Exception as repair_err:
                    print(f"[job-ranking] JSON repair failed: {repair_err}")
                    raise initial_err

            for ranked_job in data.get("ranked_jobs", []):
                r_id = str(ranked_job.get("id"))
                ranked_results[r_id] = ranked_job
            print(f"[job-ranking] Successfully ranked {len(ranked_results)} jobs.")
        except Exception as parse_error:
            print(f"[job-ranking] Failed to parse batch JSON response: {parse_error}")
            
    except Exception as gemini_error:
        print(f"[job-ranking] Gemini batch ranking error: {gemini_error}")
        
    # Enrich and compile output list
    compiled_jobs = []
    for i, job in enumerate(jobs):
        job_id = str(job.get("id") or f"job_{i}")
        
        # Get AI ranking or fallback
        if job_id in ranked_results:
            ranking_data = ranked_results[job_id]
        else:
            # If Gemini failed or skipped this job, compute fallback ranking locally
            ranking_data = _fallback_job_ranking_data(job, resume_skills)
            
        # Ensure all required keys exist in the ranking object
        ranking_data.setdefault("match_score", 50)
        ranking_data.setdefault("skill_match_score", 50)
        ranking_data.setdefault("experience_fit", 50)
        ranking_data.setdefault("matched_skills", [])
        ranking_data.setdefault("missing_skills", [])
        ranking_data.setdefault("growth_opportunities", [])
        ranking_data.setdefault("alignment_reasons", [])
        ranking_data.setdefault("concerns", [])
        ranking_data.setdefault("recommendation", "Possible Fit")
        
        job["ranking"] = ranking_data
        compiled_jobs.append(job)
        
    # Sort by match_score descending
    compiled_jobs.sort(
        key=lambda x: x.get("ranking", {}).get("match_score", 0),
        reverse=True
    )
    
    return compiled_jobs


def _fallback_job_ranking_data(job: dict, resume_skills: list[str]) -> dict:
    """
    Heuristic-based fallback ranking when Gemini fails for a job.
    Uses clean local parsing to match skills rather than displaying errors.
    """
    
    job_title = job.get("title", "").lower()
    job_description = job.get("description", "").lower()
    
    matched_skills = [
        skill for skill in resume_skills
        if skill.lower() in job_title or skill.lower() in job_description
    ]
    
    match_percentage = len(matched_skills) / len(resume_skills) * 100 if resume_skills else 0
    
    return {
        "match_score": int(match_percentage) if match_percentage > 0 else 20,
        "skill_match_score": int(match_percentage),
        "experience_fit": 50,
        "matched_skills": matched_skills,
        "missing_skills": [s for s in resume_skills if s not in matched_skills][:3],
        "growth_opportunities": [],
        "alignment_reasons": [f"Found {len(matched_skills)} matching skills from your resume."] if matched_skills else ["Technical developer match"],
        "concerns": ["Detailed AI analysis was bypassed due to API rate limits."],
        "recommendation": "Good Fit" if match_percentage >= 60 else ("Possible Fit" if match_percentage >= 20 else "Stretch Goal"),
    }
