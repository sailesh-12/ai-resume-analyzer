"""
app/services/assessment_service.py
====================================
AI question generation engine.

Takes a list of detected skills + difficulty and produces structured
MCQ + coding challenge questions using Gemini.
"""
import json
import re

import google.generativeai as genai

from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

# ─── Difficulty Configuration ────────────────────────────────────────────────

DIFFICULTY_CONFIG = {
    "easy":   {"mcq_per_skill": 2, "coding_per_skill": 0, "time_per_q": 60},
    "medium": {"mcq_per_skill": 2, "coding_per_skill": 1, "time_per_q": 90},
    "hard":   {"mcq_per_skill": 2, "coding_per_skill": 2, "time_per_q": 120},
}

# ─── Prompt ───────────────────────────────────────────────────────────────────

def _build_prompt(skills: list[str], difficulty: str, questions_per_skill: int) -> str:
    skill_list = ", ".join(skills)
    cfg = DIFFICULTY_CONFIG.get(difficulty, DIFFICULTY_CONFIG["medium"])
    mcq_count    = cfg["mcq_per_skill"]
    coding_count = cfg["coding_per_skill"]

    return f"""You are an expert technical interviewer and assessment creator.

Generate a comprehensive technical assessment for a candidate with skills in: {skill_list}
Difficulty Level: {difficulty.upper()}

For EACH skill, generate:
- {mcq_count} MCQ question(s)
- {coding_count} coding/implementation challenge(s)

You MUST respond ONLY with a raw JSON array. No markdown, no fences, no explanation.

Each MCQ object must have:
{{
  "id": <unique integer>,
  "skill": "<exact skill name from list>",
  "type": "mcq",
  "difficulty": "{difficulty}",
  "question": "<clear, specific question>",
  "options": ["A. <option>", "B. <option>", "C. <option>", "D. <option>"],
  "correct_answer": "A",
  "explanation": "<why this answer is correct>"
}}

Each coding challenge object must have:
{{
  "id": <unique integer>,
  "skill": "<exact skill name from list>",
  "type": "coding",
  "difficulty": "{difficulty}",
  "question": "<detailed problem statement with context>",
  "starter_code": "<language-appropriate starter code with comments>",
  "expected_output": "<what correct solution should produce>",
  "hints": ["<hint 1>", "<hint 2>"],
  "explanation": "<explanation of optimal approach>"
}}

Rules:
- MCQ options must always be exactly 4, labeled A through D
- correct_answer must be exactly one of: "A", "B", "C", "D"
- Make questions genuinely test understanding, not trivia
- Coding challenges must be solvable in 5-15 minutes
- Vary question styles (conceptual, practical, debugging, design)
- Make questions progressively challenging within each skill
- Total questions: {len(skills) * (mcq_count + coding_count)}

Return ONLY the JSON array starting with [ and ending with ]"""


# ─── Generator ───────────────────────────────────────────────────────────────

def generate_assessment_questions(
    skills: list[str],
    difficulty: str = "medium",
) -> list[dict]:
    """
    Call Gemini to generate a structured assessment for the given skills.
    Returns a list of question dicts ready for the DB / frontend.
    Raises ValueError on unrecoverable parse failure.
    """
    prompt = _build_prompt(skills, difficulty, questions_per_skill=3)

    response = genai.GenerativeModel(settings.GEMINI_CHAT_MODEL).generate_content(
        prompt,
        generation_config={"temperature": 0.3},  # slight variety but structured
    )
    raw = response.text if hasattr(response, "text") else str(response)

    # Strip markdown fences if Gemini disobeys the prompt
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    # Extract the JSON array even if there's preamble text
    array_match = re.search(r'\[.*\]', cleaned, re.DOTALL)
    if array_match:
        cleaned = array_match.group(0)

    questions = json.loads(cleaned)

    # Normalise and validate each question
    validated = []
    for i, q in enumerate(questions):
        q["id"] = i + 1  # re-index to be safe
        if q.get("type") == "mcq":
            _validate_mcq(q)
        validated.append(q)

    return validated


def _validate_mcq(q: dict) -> None:
    """Fix common Gemini formatting quirks in MCQ questions."""
    if "options" not in q or len(q["options"]) != 4:
        raise ValueError(f"MCQ id={q.get('id')} has malformed options")
    ans = q.get("correct_answer", "")
    # Accept "A. something" and normalise to just "A"
    q["correct_answer"] = ans[0].upper() if ans else "A"


# ─── Score Evaluator ──────────────────────────────────────────────────────────

def evaluate_mcq_answers(questions: list[dict], user_answers: dict[str, str]) -> dict:
    """
    Score MCQ answers server-side.

    user_answers: { "<question_id>": "A" | "B" | "C" | "D" }
    Returns per-skill breakdown + overall score.
    """
    skill_scores: dict[str, dict] = {}
    total_correct = 0
    total_mcq = 0

    for q in questions:
        if q["type"] != "mcq":
            continue
        skill   = q["skill"]
        qid     = str(q["id"])
        correct = q["correct_answer"]
        given   = user_answers.get(qid, "")
        is_right = given.upper() == correct.upper()

        if skill not in skill_scores:
            skill_scores[skill] = {"correct": 0, "total": 0, "percentage": 0}

        skill_scores[skill]["total"]   += 1
        total_mcq += 1
        if is_right:
            skill_scores[skill]["correct"] += 1
            total_correct += 1

    for s in skill_scores.values():
        s["percentage"] = round(s["correct"] / s["total"] * 100) if s["total"] else 0

    overall_pct = round(total_correct / total_mcq * 100) if total_mcq else 0

    return {
        "total_correct":  total_correct,
        "total_questions": total_mcq,
        "overall_percentage": overall_pct,
        "skill_breakdown": skill_scores,
    }


# ─── Recommendation Generator ─────────────────────────────────────────────────

def generate_recommendations(skill_breakdown: dict, difficulty: str) -> str:
    """
    Use Gemini to generate personalised improvement recommendations
    based on the candidate's per-skill score breakdown.
    """
    weak_skills = [
        s for s, v in skill_breakdown.items() if v["percentage"] < 60
    ]
    strong_skills = [
        s for s, v in skill_breakdown.items() if v["percentage"] >= 80
    ]

    prompt = f"""You are a senior technical mentor.

A candidate just completed a {difficulty.upper()} level technical assessment.

Results:
{json.dumps(skill_breakdown, indent=2)}

Strong areas (≥80%): {', '.join(strong_skills) or 'None'}
Needs improvement (<60%): {', '.join(weak_skills) or 'None'}

Provide a concise, encouraging, actionable improvement plan:
1. Celebrate their strengths briefly
2. For each weak skill, give 2-3 specific resources/actions
3. Suggest a 2-week study plan
4. Recommend what difficulty to try next

Keep it under 300 words. Be specific, practical, and motivating."""

    response = genai.GenerativeModel(settings.GEMINI_CHAT_MODEL).generate_content(
        prompt,
        generation_config={"temperature": 0.5},
    )
    return response.text if hasattr(response, "text") else str(response)
