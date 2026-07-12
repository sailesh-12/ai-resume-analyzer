"""
app/services/rag_service.py
===========================
RAG pipeline: semantic search + Gemini generation.
No FastAPI, no HTTP — pure AI logic.
"""
import json
import re
import time
import logging

import numpy as np
import google.generativeai as genai
import faiss
from google.api_core.exceptions import ResourceExhausted, InvalidArgument, PermissionDenied, Unauthenticated

from app.core.config import settings

logger = logging.getLogger(__name__)


# ─── Gemini API key validation ────────────────────────────────────────────────

def _validate_api_key() -> None:
    """
    Validate the Gemini API key at startup.
    Gemini keys always start with 'AIza'.  If the key is missing or looks
    wrong we log a clear warning so the developer knows immediately.
    """
    key = settings.GEMINI_API_KEY
    if not key:
        logger.error(
            "[rag_service] GOOGLE_GEMINI_API_KEY is not set. "
            "All AI features will fail. Set the key in your .env file."
        )
        return
    if not key.startswith("AIza"):
        logger.error(
            f"[rag_service] GOOGLE_GEMINI_API_KEY looks invalid (got '{key[:12]}…'). "
            "Valid Gemini API keys start with 'AIza'. "
            "Get a key at https://aistudio.google.com/app/apikey"
        )
    else:
        logger.info(f"[rag_service] Gemini API key validated: {key[:12]}…")


_validate_api_key()


# ─── Retry helper ─────────────────────────────────────────────────────────────

def _call_with_retry(fn, *, retries: int = 3, base_delay: float = 2.0):
    """
    Call *fn* up to *retries* times, retrying only on transient errors
    (ResourceExhausted / 429).  Authentication and argument errors are
    re-raised immediately — retrying won't fix them.
    """
    for attempt in range(retries):
        try:
            return fn()
        except ResourceExhausted as e:
            if attempt < retries - 1:
                wait = base_delay * (2 ** attempt)   # 2s, 4s, 8s …
                logger.warning(
                    f"[rag_service] Gemini rate-limited (attempt {attempt + 1}/{retries}). "
                    f"Retrying in {wait:.0f}s…"
                )
                time.sleep(wait)
            else:
                raise
        except (PermissionDenied, Unauthenticated, InvalidArgument):
            # These will never succeed on retry — surface immediately.
            raise


# ─── Embedding helper ─────────────────────────────────────────────────────────

def _embed(text: str) -> np.ndarray:
    """Embed *text* with Gemini and return a float32 numpy array."""
    result = _call_with_retry(
        lambda: genai.embed_content(
            model=settings.GEMINI_EMBED_MODEL,
            content=text,
        )
    )
    return np.array(result["embedding"], dtype="float32")


# ─── RAG Query ────────────────────────────────────────────────────────────────

def query_rag(
    query: str,
    vectors: list,
    index: faiss.Index,
    top_k: int = 5,
) -> tuple[str, list[str], np.ndarray]:
    """
    Embed query → retrieve top-k chunks → generate answer with Gemini.

    Returns:
        answer           – Gemini's generated text
        retrieved_chunks – list of matched text chunks
        distances        – FAISS distances for those chunks

    Raises:
        Any Gemini API error that is not transient (e.g. invalid API key,
        permission denied) so callers can surface a clear error message
        instead of silently producing garbage output.
    """
    # 1. Embed the query
    query_vec = _embed(query).reshape(1, -1)

    # 2. Retrieve top-k chunks from the FAISS index
    distances, indices = index.search(query_vec, top_k)
    retrieved = [vectors[i][0] for i in indices[0]]
    context   = "\n\n".join(retrieved)

    # 3. Build the prompt
    prompt = (
        "You are an expert recruiter and HR professional analyzing resumes.\n"
        "Use ONLY the resume content provided below. "
        "Do NOT add information not present in the resume.\n\n"
        f"Resume content:\n{context}\n\n"
        f"Task:\n{query}\n\n"
        "Respond strictly as instructed in the task above."
    )

    # 4. Generate with Gemini (with retry on rate-limit)
    response = _call_with_retry(
        lambda: genai.GenerativeModel(settings.GEMINI_CHAT_MODEL).generate_content(
            prompt,
            generation_config={"temperature": 0.0},
        )
    )
    answer = response.text if hasattr(response, "text") else str(response)

    return answer, retrieved, distances[0]


# ─── JSON Cleaning ────────────────────────────────────────────────────────────

def clean_json_response(raw: str) -> str:
    """Strip markdown code fences and leading/trailing whitespace from LLM JSON responses."""
    cleaned = raw.strip()
    # Remove ```json ... ``` or ``` ... ``` wrappers
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


# ─── Parsers (regex fallback) ─────────────────────────────────────────────────

def extract_score_from_text(text: str) -> int:
    """Regex fallback: find an X/10 or X out of 10 score in text."""
    patterns = [
        r'(?:rating|score)[\s:]*(\d+)\s*(?:/|out of)\s*10',
        r'(\d+)\s*(?:/|out of)\s*10',
    ]
    for p in patterns:
        m = re.search(p, text.lower())
        if m:
            return min(10, max(0, int(m.group(1))))
    return 0


def extract_insights_from_text(text: str) -> dict:
    """Regex fallback: extract structured insights from unstructured LLM text."""
    insights: dict = {
        "strengths":        [],
        "improvements":     [],
        "technical_skills": [],
        "experience_years": 0,
        "education":        [],
        "format_score":     7,
    }
    section_map = {
        "strength":   "strengths",
        "improve":    "improvements",
        "weakness":   "improvements",
        "suggestion": "improvements",
        "skill":      "technical_skills",
        "technical":  "technical_skills",
        "education":  "education",
        "degree":     "education",
    }
    current = None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        lower = line.lower()
        for keyword, section in section_map.items():
            if keyword in lower:
                current = section
                break
        if current and re.match(r'^[-•*]', line):
            item = line.lstrip("-•* ").strip()
            if item and isinstance(insights.get(current), list):
                insights[current].append(item)

    exp = re.search(r'(\d+)\s*(?:years?|yrs?)', text.lower())
    if exp:
        insights["experience_years"] = int(exp.group(1))
    return insights


# ─── Structured Main-Analysis Prompt ─────────────────────────────────────────

FULL_ANALYSIS_QUERY = """You are an expert recruiter, HR professional, and resume strategist with 15+ years of experience.
Analyze this resume comprehensively and respond with ONLY a valid JSON object (no markdown, no code fences).

Evaluate across these 6 core dimensions:
1. **Profile Overview** — Brief summary of the candidate
2. **Strengths** — Key achievements, skills, and positive aspects
3. **Weaknesses/Gaps** — Areas for improvement and missing elements
4. **ATS Optimization** — Specific formatting and keyword recommendations
5. **Actionable Next Steps** — Concrete suggestions for career growth
6. **Overall Assessment** — Professional verdict with score

Return ONLY this JSON structure (valid, parseable JSON):
{
  "score": <0-10 integer>,
  "profile_overview": "<1-2 sentence summary of the candidate>",
  "strengths": [
    "<specific strength with context>",
    "<skill/achievement that stands out>",
    "<positive aspect of resume format or content>"
  ],
  "weaknesses": [
    "<specific gap or area for improvement>",
    "<formatting or content issue with recommendation>",
    "<missing section or information>"
  ],
  "ats_tips": [
    "<specific ATS formatting recommendation>",
    "<keyword optimization tip>",
    "<section structure improvement>"
  ],
  "next_steps": [
    "<concrete action 1 — specific and measurable>",
    "<concrete action 2 — specific and measurable>",
    "<concrete action 3 — specific and measurable>"
  ],
  "professional_assessment": "<2-3 sentence professional verdict explaining the score>"
}

Scoring rubric:
- 9-10: Exceptional — Strong experience, excellent presentation, clear trajectory
- 7-8: Good — Solid experience, clean formatting, marketable skills
- 5-6: Average — Some experience, okay presentation, could be stronger
- 3-4: Below Average — Limited experience, formatting issues, needs improvement
- 0-2: Poor — Very limited credentials or major formatting problems

Be honest, specific, and constructive. Use industry terminology."""


SCORE_BREAKDOWN_QUERY = """Rate this resume 0–10 for each category.
Respond ONLY with raw JSON — no markdown fences:
{
  "format": <int 0-10>,
  "content": <int 0-10>,
  "experience": <int 0-10>,
  "education": <int 0-10>,
  "skills": <int 0-10>,
  "details": "<paragraph explaining the scores>"
}"""


IMPROVEMENTS_QUERY = """Provide specific, actionable improvement suggestions for this resume:
1. Formatting improvements
2. Content improvements
3. Skills presentation improvements
4. Experience section improvements
5. Quick wins for immediate improvement
Be concise and practical."""


STRENGTHS_QUERY = """Identify and highlight the main strengths of this resume:
1. Key strengths shown in experience
2. Strong skills and expertise areas
3. Educational achievements
4. Well-presented aspects
5. Unique selling points
Be specific and encouraging."""


METRICS_QUERY = """Extract and count:
1. Number of years of work experience
2. Number of degrees/qualifications
3. Technical skills mentioned
4. Tools and technologies listed
5. Projects or achievements mentioned"""


# ─── Radar Analysis (6 Dimensions) ───────────────────────────────────────────

RADAR_ANALYSIS_QUERY = """Analyze this resume across 6 key professional dimensions and rate each 0-10.
Respond ONLY with raw JSON (no markdown fences, no code blocks):
{
  "communication": {
    "score": <0-10>,
    "label": "Communication Skills",
    "insight": "<1 sentence explanation>"
  },
  "technical": {
    "score": <0-10>,
    "label": "Technical Proficiency",
    "insight": "<1 sentence explanation>"
  },
  "experience": {
    "score": <0-10>,
    "label": "Experience Level",
    "insight": "<1 sentence explanation>"
  },
  "ats": {
    "score": <0-10>,
    "label": "ATS Compatibility",
    "insight": "<1 sentence explanation>"
  },
  "achievement": {
    "score": <0-10>,
    "label": "Achievement Impact",
    "insight": "<1 sentence explanation>"
  },
  "presentation": {
    "score": <0-10>,
    "label": "Professional Presentation",
    "insight": "<1 sentence explanation>"
  }
}

Scoring:
- Communication: How well does the resume convey ideas clearly and effectively?
- Technical: How strong are technical skills and domain expertise?
- Experience: Years, depth, and progression of professional experience?
- ATS: How well formatted for Applicant Tracking System parsing?
- Achievement: Quality and impact of accomplishments mentioned?
- Presentation: Overall professionalism, formatting, visual appeal?"""


def generate_radar_analysis(
    analysis_data: dict,
    vectors: list,
    index: faiss.Index,
) -> dict:
    """
    Generate multi-dimensional radar analysis (6 core dimensions).

    Args:
        analysis_data  – Existing full analysis result (used for fallback scores)
        vectors        – Resume text chunks (for context)
        index          – FAISS index for retrieval

    Returns:
        Dictionary with 6 dimensions, each with score, label, and insight.
    """
    required = ["communication", "technical", "experience", "ats", "achievement", "presentation"]

    try:
        radar_response = query_rag(RADAR_ANALYSIS_QUERY, vectors, index, top_k=3)[0]

        cleaned    = clean_json_response(radar_response)
        radar_data = json.loads(cleaned)

        # Validate — must have at least one dimension key to be a real radar response
        if not any(dim in radar_data for dim in required):
            raise ValueError("Parsed JSON does not contain any radar dimension keys.")

        # Fill in any missing dimensions with score-derived defaults
        base = analysis_data.get("score", 5)
        for dim in required:
            if dim not in radar_data:
                radar_data[dim] = {
                    "score": base,
                    "label": dim.replace("_", " ").title(),
                    "insight": f"Estimated from overall resume score of {base}/10.",
                }
            else:
                radar_data[dim].setdefault("label", dim.replace("_", " ").title())
                radar_data[dim].setdefault("insight", "See full analysis for details.")

        return radar_data

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning(f"[rag_service] Radar JSON parse failed ({e}); using score-derived fallback.")
    except Exception as e:
        logger.error(f"[rag_service] Radar Gemini call failed ({type(e).__name__}: {e}); using score-derived fallback.")

    # Score-derived fallback (only reached if Gemini or JSON parsing failed)
    score    = analysis_data.get("score", 5)
    clamp    = lambda v: min(10, max(0, v))
    strengths  = analysis_data.get("strengths", [])
    weaknesses = analysis_data.get("weaknesses", [])

    return {
        "communication": {
            "score": clamp(score),
            "label": "Communication Skills",
            "insight": strengths[0] if strengths else "Assessed from written presentation quality.",
        },
        "technical": {
            "score": clamp(score + 1 if score < 9 else score),
            "label": "Technical Proficiency",
            "insight": strengths[1] if len(strengths) > 1 else "Inferred from technical content depth.",
        },
        "experience": {
            "score": clamp(score),
            "label": "Experience Level",
            "insight": strengths[2] if len(strengths) > 2 else "Based on experience section content.",
        },
        "ats": {
            "score": clamp(score - 1 if score > 1 else score),
            "label": "ATS Compatibility",
            "insight": weaknesses[0] if weaknesses else "Estimated from resume structure and formatting.",
        },
        "achievement": {
            "score": clamp(score),
            "label": "Achievement Impact",
            "insight": weaknesses[1] if len(weaknesses) > 1 else "Based on quantifiable achievements found.",
        },
        "presentation": {
            "score": clamp(score - 1 if score > 1 else score),
            "label": "Professional Presentation",
            "insight": weaknesses[2] if len(weaknesses) > 2 else "Overall formatting and visual appeal assessment.",
        },
    }
