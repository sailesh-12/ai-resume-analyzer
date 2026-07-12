"""
app/main.py
===========
FastAPI application factory.
Only wires middleware, routers, and startup events together.
Keep this file under 60 lines.

Run with:
    uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
"""
from contextlib import asynccontextmanager
import google.generativeai as genai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongo import get_client
from app.api.routes.auth     import router as auth_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.jobs     import router as jobs_router

# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    genai.configure(api_key=settings.GEMINI_API_KEY)
    key_preview = settings.GEMINI_API_KEY[:12] if settings.GEMINI_API_KEY else "NOT SET"
    print(f"[startup] Gemini API key loaded: {key_preview}…")
    print(f"[startup] CORS origins: {settings.ALLOWED_ORIGINS}")
    app.state.mongodb_ready = False
    
    # Test MongoDB connection
    try:
        client = get_client()
        client.admin.command('ping')
        app.state.mongodb_ready = True
        print("[startup] MongoDB connected [OK]")
    except Exception as e:
        print(f"[startup] MongoDB connection failed: {e}")
        print("[startup] Continuing without MongoDB; endpoints that need it will fail on use")
    
    print("[startup] Resume Analyzer API is ready [OK]")
    yield
    # Shutdown
    print("[shutdown] Resume Analyzer API shutting down [OK]")

# ─── App Factory ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Resume Analyzer API",
    description="AI-powered resume analysis using RAG + Gemini",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

# Auth routes mounted at /login and /signup to maintain frontend compatibility
app.include_router(auth_router)
app.include_router(analysis_router, prefix="")
app.include_router(jobs_router)

# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "version": "2.0.0", "service": "Resume Analyzer API"}
