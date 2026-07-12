"""
app/api/routes/analysis.py
==========================
Resume analysis endpoints:
  POST /rag-query          – full RAG analysis (cached)
  POST /analyze-score      – score breakdown per category
  POST /analyze-improvements – improvement suggestions
  POST /analyze-strengths  – strengths highlight
  POST /analyze-metrics    – document metrics

All heavy logic lives in services/. Routes are thin HTTP adapters.
"""
import hashlib
import json
import os
import tempfile

import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from google.api_core.exceptions import ResourceExhausted

from app.services.pdf_service import pdf_to_vector_index, extract_text_from_pdf
from app.services.rag_service import (
    query_rag,
    clean_json_response,
    extract_score_from_text,
    extract_insights_from_text,
    generate_radar_analysis,
    FULL_ANALYSIS_QUERY,
    SCORE_BREAKDOWN_QUERY,
    IMPROVEMENTS_QUERY,
    STRENGTHS_QUERY,
    METRICS_QUERY,
)

router = APIRouter(tags=["Analysis"])

# ─── In-memory cache (SHA-256 hash → result dict) ───────────────────────────
_cache: dict = {}


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _save_temp(file: UploadFile) -> tuple[str, bytes]:
    """Write uploaded bytes to a temp file; return (path, raw_bytes)."""
    file_bytes = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        return tmp.name, file_bytes


def _handle_rate_limit(exc: ResourceExhausted) -> None:
    """Convert a Gemini ResourceExhausted error into a structured 429."""
    import re
    retry = 60
    m = re.search(r'retry.*?(\d+).*?second', str(exc), re.IGNORECASE)
    if m:
        retry = int(m.group(1))
    raise HTTPException(
        status_code=429,
        detail={
            "error": "API rate limit reached",
            "message": (
                f"The Gemini API quota has been exhausted. "
                f"Please wait {retry} seconds and try again."
            ),
            "retry_after_seconds": retry,
        },
    )


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/rag-query")
async def rag_query(file: UploadFile):
    """
    Full resume analysis. Results cached by SHA-256 hash of the PDF bytes —
    the same file never calls the Gemini API twice.
    """
    file_bytes = await file.read()
    file_hash  = hashlib.sha256(file_bytes).hexdigest()

    if file_hash in _cache:
        print(f"[rag-query] Cache HIT  — {file.filename} ({file_hash[:8]}…)")
        return JSONResponse(content=_cache[file_hash])

    print(f"[rag-query] Cache MISS — analyzing {file.filename} ({file_hash[:8]}…)")

    # Write to temp file, build index, then delete
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        vectors, _, index = pdf_to_vector_index(tmp_path)
    finally:
        os.remove(tmp_path)

    # Query Gemini
    try:
        raw, retrieved, distances = query_rag(FULL_ANALYSIS_QUERY, vectors, index)
    except ResourceExhausted as e:
        _handle_rate_limit(e)

    # Parse structured JSON response
    cleaned = clean_json_response(raw)
    score = 0
    analysis_data = {
        "profile_overview": "",
        "strengths": [],
        "weaknesses": [],
        "ats_tips": [],
        "next_steps": [],
        "professional_assessment": "",
    }
    insights = {
        "strengths": [], "improvements": [], "technical_skills": [],
        "experience_years": 0, "education": [], "format_score": 7,
    }

    try:
        parsed = json.loads(cleaned)
        score = min(10, max(0, int(parsed.get("score", 0))))
        
        # Extract structured fields
        analysis_data["profile_overview"] = parsed.get("profile_overview", "")
        analysis_data["strengths"] = parsed.get("strengths", [])
        analysis_data["weaknesses"] = parsed.get("weaknesses", [])
        analysis_data["ats_tips"] = parsed.get("ats_tips", [])
        analysis_data["next_steps"] = parsed.get("next_steps", [])
        analysis_data["professional_assessment"] = parsed.get("professional_assessment", "")
        
        # For insights compatibility
        insights["strengths"] = analysis_data["strengths"]
        insights["improvements"] = analysis_data["weaknesses"]
        insights["format_score"] = score
    except Exception as exc:
        print(f"[rag-query] JSON parse failed ({exc}) — using fallback")
        score = extract_score_from_text(raw)
        insights = extract_insights_from_text(raw)
        analysis_data["professional_assessment"] = raw.replace("**", "").strip()

    result = {
        "score": score,
        "analysis": analysis_data,
        "insights": insights,
        "retrieved_chunks": retrieved,
        "distances": list(distances),
    }
    encoded = jsonable_encoder(result, custom_encoder={
        np.float32: float, np.float64: float,
        np.int32: int, np.int64: int,
        np.ndarray: lambda a: a.tolist(),
    })
    _cache[file_hash] = encoded
    print(f"[rag-query] Cached result for {file_hash[:8]}…")
    return JSONResponse(content=encoded)


@router.post("/analyze-score")
async def analyze_score(file: UploadFile):
    """Score breakdown per category (format, content, experience, education, skills)."""
    tmp_path, _ = await _save_temp(file)
    try:
        vectors, _, index = pdf_to_vector_index(tmp_path)
        raw, _, _ = query_rag(SCORE_BREAKDOWN_QUERY, vectors, index)
        cleaned   = clean_json_response(raw)

        scores  = {k: 7 for k in ("format", "content", "experience", "education", "skills")}
        details = raw

        try:
            parsed = json.loads(cleaned)
            for k in scores:
                if k in parsed:
                    scores[k] = min(10, max(0, int(parsed[k])))
            details = parsed.get("details", raw)
        except Exception:
            import re
            for k in scores:
                m = re.search(rf'"{k}"\s*:\s*(\d+)', cleaned)
                if m:
                    scores[k] = min(10, max(0, int(m.group(1))))

        return {
            "overall":   sum(scores.values()) // len(scores),
            "breakdown": scores,
            "details":   details,
        }
    finally:
        os.remove(tmp_path)


@router.post("/analyze-improvements")
async def analyze_improvements(file: UploadFile):
    """Actionable improvement suggestions for the resume."""
    tmp_path, _ = await _save_temp(file)
    try:
        vectors, _, index = pdf_to_vector_index(tmp_path)
        answer, _, _ = query_rag(IMPROVEMENTS_QUERY, vectors, index)
        return {"improvements": answer, "priority_areas": extract_insights_from_text(answer)}
    finally:
        os.remove(tmp_path)


@router.post("/analyze-strengths")
async def analyze_strengths(file: UploadFile):
    """Strengths and highlighted sections of the resume."""
    tmp_path, _ = await _save_temp(file)
    try:
        vectors, _, index = pdf_to_vector_index(tmp_path)
        answer, _, _ = query_rag(STRENGTHS_QUERY, vectors, index)
        return {"strengths": answer, "highlights": extract_insights_from_text(answer)}
    finally:
        os.remove(tmp_path)


@router.post("/analyze-metrics")
async def analyze_metrics(file: UploadFile):
    """Quantitative metrics about the resume document."""
    tmp_path, _ = await _save_temp(file)
    try:
        pages, _ = extract_text_from_pdf(tmp_path)
        vectors, chunks_meta, index = pdf_to_vector_index(tmp_path)
        answer, _, _ = query_rag(METRICS_QUERY, vectors, index)
        return {
            "pages":                len(pages),
            "chunks":               len(chunks_meta),
            "total_content_length": sum(len(c[0]) for c in vectors),
            "details":              answer,
        }
    finally:
        os.remove(tmp_path)


@router.post("/analyze-radar")
async def analyze_radar(file: UploadFile):
    """Multi-dimensional radar analysis (6 core dimensions)."""
    file_bytes = await file.read()
    file_hash  = hashlib.sha256(file_bytes).hexdigest()

    # Reuse cached full-analysis result if available (avoids re-embedding the PDF)
    cached = _cache.get(file_hash)
    if cached:
        print(f"[analyze-radar] Reusing cached analysis for {file_hash[:8]}…")
        analysis_data = {
            "score": cached.get("score", 5),
            "strengths": cached.get("analysis", {}).get("strengths", []),
            "weaknesses": cached.get("analysis", {}).get("weaknesses", []),
            "profile_overview": cached.get("analysis", {}).get("profile_overview", ""),
            "professional_assessment": cached.get("analysis", {}).get("professional_assessment", ""),
        }
    else:
        analysis_data = None

    # Write to temp file and build vector index
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        vectors, _, index = pdf_to_vector_index(tmp_path)

        # If we don't have cached analysis, run the full analysis query
        if analysis_data is None:
            try:
                raw, retrieved, distances = query_rag(FULL_ANALYSIS_QUERY, vectors, index)
            except ResourceExhausted as e:
                _handle_rate_limit(e)

            cleaned = clean_json_response(raw)
            try:
                parsed = json.loads(cleaned)
                score = min(10, max(0, int(parsed.get("score", 0))))
                analysis_data = {
                    "score": score,
                    "strengths": parsed.get("strengths", []),
                    "weaknesses": parsed.get("weaknesses", []),
                    "profile_overview": parsed.get("profile_overview", ""),
                    "professional_assessment": parsed.get("professional_assessment", ""),
                }
            except Exception:
                score = extract_score_from_text(raw)
                analysis_data = {"score": score, "strengths": [], "weaknesses": []}

        # Generate radar data — fallback is handled inside generate_radar_analysis
        try:
            radar_data = generate_radar_analysis(analysis_data, vectors, index)
        except Exception as e:
            print(f"[analyze-radar] Failed to generate radar ({e})")
            clamp = lambda v: min(10, max(0, v))
            s = analysis_data.get("score", 5)
            radar_data = {
                "communication": {"score": clamp(s), "label": "Communication Skills", "insight": "Estimated from overall score."},
                "technical": {"score": clamp(s + 1), "label": "Technical Proficiency", "insight": "Estimated from overall score."},
                "experience": {"score": clamp(s), "label": "Experience Level", "insight": "Estimated from overall score."},
                "ats": {"score": clamp(s - 1), "label": "ATS Compatibility", "insight": "Estimated from overall score."},
                "achievement": {"score": clamp(s), "label": "Achievement Impact", "insight": "Estimated from overall score."},
                "presentation": {"score": clamp(s - 1), "label": "Professional Presentation", "insight": "Estimated from overall score."},
            }

        encoded = jsonable_encoder(radar_data, custom_encoder={
            np.float32: float, np.float64: float,
            np.int32: int, np.int64: int,
            np.ndarray: lambda a: a.tolist(),
        })
        return JSONResponse(content=encoded)
    finally:
        os.remove(tmp_path)

