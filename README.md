# 📊 Resume Analyzer & AI Job Matcher

An enterprise-grade, full-stack application that leverages **Retrieval-Augmented Generation (RAG)**, semantic embeddings, and the **Google Gemini API** to parse, score, and analyze PDF resumes. It generates a high-fidelity professional quality report, evaluates candidates across six key professional dimensions, and aggregates real-world job listings mapped directly to the candidate's skills and experience.

---

## 🚀 Key Features

### 1. Resume Parsing & RAG Scoring
* **Text Extraction & Vectorization**: Parses resumes using PyPDF2, splits content into overlapping chunks (100-character overlap) to preserve context, and builds a local **FAISS L2 vector index**.
* **Gemini LLM Querying**: Performs semantic retrieval against the candidate's profile to answer recruiter queries and extract core parameters.
* **Double-API Cache Accelerator**: Deduplicates PDF uploads via SHA-256 hashing. Multiple calls for the same file fetch instant results from memory in `<1ms`, avoiding redundant Gemini embedding and chat generations.

### 2. Premium Quality Report Dashboard
* **Animated Score Gauge**: A circular SVG progress ring featuring cubic ease-out entry and value count-up animations.
* **Category Breakdown Progress**: Visualizes performance across formatting, content, experience, education, and skills with individual letter-grade indicators and progress fills.
* **Multi-Dimensional Radar Chart**: A custom-drawn, dark-theme compatible SVG spider chart mapping candidate profile strengths (Communication, Technical, Experience, ATS, Achievement, Presentation).

### 3. AI Job Matcher & Ranker
* **Adzuna Job Board Integration**: Automatically searches real-world job listings using extracted technical skills.
* **AI-Powered Fit Assessment**: Ranks active listings using Gemini JSON Mode to score alignment on skills and experience, identify missing keywords, highlight growth opportunities, and output structured recommendations (`Strong Fit`, `Good Fit`, `Possible Fit`).
* **Strict Filter Control**: Safely filters out mismatch listings (classified as `"Stretch Goal"`) and ranks valid listings automatically.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, Vite, React Router v7, React Hot Toast, Vanilla CSS (Modern CSS properties, color-mix, glassmorphic UI).
* **Backend**: FastAPI, PyPDF2, FAISS, NumPy, Google Generative AI Python SDK.
* **Database**: MongoDB (Client integration for auth metadata).
* **APIs**: Adzuna Jobs Search API, Google Gemini (embedding-001, gemini-2.5-flash).

---

## 📁 Folder Structure

```text
RagPdf/
├── SETUP_GUIDE.md               # Backend and frontend setup instructions
├── test_resume.pdf              # Sample PDF resume for testing
│
├── resume-analyzer/             # React Frontend (Vite)
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # Base UI elements (Badge, Button, Card, etc.)
│   │   │   ├── FileUploader.jsx # PDF dropzone and file uploader
│   │   │   └── RadarChart.jsx   # Theme-aware SVG spider chart
│   │   │
│   │   ├── pages/               # Page-level containers
│   │   │   ├── UploadPage.jsx   # Landing upload area
│   │   │   ├── ResultsPage.jsx  # Redesigned premium Quality Report
│   │   │   └── JobsPage.jsx     # Recommended job matching board
│   │   │
│   │   ├── services/            # Axios API wrappers (api.js, analysisService.js, jobsService.js)
│   │   ├── context/             # Global contexts (Auth, Analysis, Theme)
│   │   ├── App.jsx              # Main router & provider setup
│   │   └── App.css              # Central application stylesheets
│   └── package.json             # Frontend dependency list
│
└── venv/                        # Python virtual environment (Backend API)
    └── app/                     # Backend Source Code (FastAPI)
        ├── api/routes/          # Route handlers (auth, analysis, jobs)
        ├── services/            # Core logic (pdf_service, rag_service, job_ranking_service)
        └── main.py              # FastAPI app definition & startup lifespans
```

---

## ⚙️ Environment Variables Configuration

### Backend Setup (`venv/.env` or system environment variables)
Create a `.env` file in the root folder with the following variables:
```env
# Google Gemini API Configuration (Get one at https://aistudio.google.com/)
GEMINI_API_KEY=AIzaSy...

# Adzuna API Access Credentials (Get at https://developer.adzuna.com/)
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key

# MongoDB Connection String (Optional, fallback enabled)
MONGO_URI=mongodb://localhost:27017/resume_analyzer
```

### Frontend Setup (`resume-analyzer/.env`)
```env
# Backend API Base URL
VITE_API_URL=http://127.0.0.1:8000
```

---

## 🚀 Quick Start Guide

### 1. Run the Python Backend API
Navigate to the root directory, activate the python environment, and run the Uvicorn dev server:
```powershell
# Navigate to the workspace root
cd c:\Users\Hp\Desktop\RagPdf

# Activate virtual environment (Windows)
.\venv\Scripts\activate

# Start the FastAPI application
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
The documentation will be available at: `http://127.0.0.1:8000/docs`

### 2. Run the React Frontend
Open a new terminal window, navigate to the frontend folder, install dependencies, and run Vite:
```bash
# Navigate to frontend folder
cd resume-analyzer

# Install packages
npm install

# Start Vite dev server
npm run dev
```
Open your browser and navigate to the local URL (usually `http://localhost:5173`).

---

## 🔧 API Specifications

### `POST /rag-query`
Uploads a resume PDF and performs a complete RAG-based analysis. Returns score, overview, strengths, weaknesses, ATS optimization tips, and recommended next steps.
* **Payload**: `file` (multipart/form-data)
* **Response**:
```json
{
  "score": 8,
  "analysis": {
    "profile_overview": "Candidate has 5 years of Python backend experience.",
    "strengths": ["Strong FastAPI knowledge", "Good unit test coverage"],
    "weaknesses": ["Lack of cloud deployment metrics"],
    "ats_tips": ["Incorporate Kubernetes keywords"],
    "next_steps": ["Add a certification segment"],
    "professional_assessment": "Veritable fit for intermediate positions."
  },
  "insights": {
    "strengths": [...],
    "improvements": [...]
  }
}
```

### `POST /jobs/rank-jobs`
Ranks list of job descriptions against candidate skills and experience using Gemini JSON Mode.
* **Payload**: `file` (multipart/form-data PDF), `jobs_json` (stringified JSON array of jobs)
* **Response**:
```json
{
  "ranked_jobs": [
    {
      "id": "adzuna_job_id",
      "match_score": 85,
      "skill_match_score": 90,
      "experience_fit": 80,
      "matched_skills": ["Python", "React"],
      "missing_skills": ["Docker"],
      "alignment_reasons": ["Matches Python experience", "Vite/React stack matches"],
      "concerns": [],
      "recommendation": "Strong Fit"
    }
  ],
  "candidate_skills": ["Python", "React", "SQL"],
  "top_matches": ["Software Engineer"],
  "total_ranked": 1
}
```
