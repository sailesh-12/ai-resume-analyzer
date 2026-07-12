"""
app/core/config.py
==================
Central configuration — reads all env variables in one place.
Every other module imports from here; nothing reads os.getenv directly.
"""
import os
import pathlib
from dotenv import load_dotenv

# Always resolve .env relative to the project root (parent of app/)
_ENV_PATH = pathlib.Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=False)


class Settings:
    # Gemini AI
    GEMINI_API_KEY: str = os.getenv("GOOGLE_GEMINI_API_KEY", "")
    GEMINI_EMBED_MODEL: str = os.getenv("GEMINI_EMBED_MODEL", "models/gemini-embedding-001")
    GEMINI_CHAT_MODEL: str  = os.getenv("GEMINI_CHAT_MODEL", "models/gemini-2.5-flash")

    # MongoDB
    MONGO_URI: str = os.getenv("MONGO_DB_URI", "")
    MONGO_DB:  str = "resume_db"
    USERS_COLLECTION: str = "users"
    JOBS_COLLECTION: str = "jobs"
    SKILLS_COLLECTION: str = "skills"
    JOB_MATCHES_COLLECTION: str = "job_matches"

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ALGORITHM:  str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Adzuna API
    ADZUNA_API_ID: str = os.getenv("ADZUNA_API_ID", "")
    ADZUNA_API_KEY: str = os.getenv("ADZUNA_API_KEY", "")

    # CORS — comma-separated list in env, e.g. "http://localhost:5173,http://localhost:3000"
    ALLOWED_ORIGINS: list[str] = os.getenv("ALLOWED_ORIGINS", "*").split(",")


settings = Settings()
