"""
rag_api.py  (root entry point — kept for backward compatibility)
================================================================
This file is the original entry point that uvicorn was called with:
    python rag_api.py
    uvicorn rag_api:app --reload

It now delegates everything to the refactored app/ package.

PREFERRED way to run (new):
    uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

LEGACY way to run (still works):
    python rag_api.py
"""
import sys
import os

# Ensure the venv directory is on the Python path so `app.*` imports resolve
sys.path.insert(0, os.path.dirname(__file__))

from app.main import app  # noqa: F401 — re-export for uvicorn

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)