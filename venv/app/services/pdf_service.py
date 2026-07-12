"""
app/services/pdf_service.py
===========================
PDF parsing and FAISS vector index creation.
Completely decoupled from FastAPI and HTTP concerns.
"""
import hashlib
import numpy as np
import faiss
import google.generativeai as genai

from app.core.config import settings

# Configure Gemini once at import time
genai.configure(api_key=settings.GEMINI_API_KEY)


def _simple_embedding(text: str, dim: int = 768) -> np.ndarray:
    """
    Fallback embedding using hash-based approach.
    Creates a deterministic vector from text hash.
    
    Args:
        text: Text to embed
        dim: Embedding dimension (must match FAISS index)
    
    Returns:
        numpy array of shape (dim,) with float32 values
    """
    # Create hash of text
    hash_obj = hashlib.sha256(text.encode())
    hash_bytes = hash_obj.digest()
    
    # Create deterministic random generator from hash
    seed = int.from_bytes(hash_bytes[:4], 'big')
    rng = np.random.RandomState(seed)
    
    # Generate embedding from seeded random state
    embedding = rng.randn(dim).astype('float32')
    
    # Normalize
    embedding = embedding / (np.linalg.norm(embedding) + 1e-8)
    
    return embedding


def extract_text_from_pdf(pdf_path: str) -> tuple[list[dict], str]:
    """
    Read every page of a PDF and return:
      - pages: list of {"text": str, "page_number": int}
      - full_text: concatenated text of all pages
    """
    from PyPDF2 import PdfReader
    reader = PdfReader(pdf_path)
    pages, full_text = [], ""
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append({"text": text, "page_number": i + 1})
        full_text += text
    return pages, full_text


def build_vector_index(
    full_text: str,
    total_pages: int,
    chunk_size: int = 500,
    overlap: int = 100,
) -> tuple[list[tuple[str, np.ndarray]], list[dict], faiss.Index]:
    """
    Split text into overlapping chunks, embed each with Gemini,
    and return the vectors + a FAISS flat-L2 index.

    Returns:
        vectors       – list of (chunk_text, embedding_array)
        chunks_meta   – list of {"start_pos": int, "estimated_page": int}
        index         – FAISS IndexFlatL2 ready for searching
    """
    chunks, chunks_meta = [], []
    step = max(1, chunk_size - overlap)

    for i in range(0, len(full_text), step):
        chunk = full_text[i : i + chunk_size].strip()
        if not chunk:
            continue
        est_page = min(int(i / max(len(full_text), 1) * total_pages) + 1, total_pages)
        chunks.append(chunk)
        chunks_meta.append({"start_pos": i, "estimated_page": est_page})

    print(f"[pdf_service] {len(chunks)} chunks created")

    vectors = []
    use_fallback = False
    
    for i, chunk in enumerate(chunks):
        try:
            # Try to use Gemini embeddings
            resp = genai.embed_content(model=settings.GEMINI_EMBED_MODEL, content=chunk)
            embedding = np.array(resp["embedding"], dtype="float32")
        except Exception as e:
            # Fallback to hash-based embedding if Gemini fails
            if not use_fallback:
                print(f"[pdf_service] Gemini embeddings unavailable ({type(e).__name__}), using hash-based fallback")
                use_fallback = True
            
            embedding = _simple_embedding(chunk, dim=768)
        
        vectors.append((chunk, embedding))

    emb_matrix = np.array([e for _, e in vectors])
    index = faiss.IndexFlatL2(emb_matrix.shape[1])
    index.add(emb_matrix)
    print(f"[pdf_service] FAISS index built — {index.ntotal} vectors")

    return vectors, chunks_meta, index


def pdf_to_vector_index(pdf_path: str, chunk_size: int = 500):
    """
    Convenience wrapper: read PDF → build index.
    Returns (vectors, chunks_meta, faiss_index).
    """
    pages, full_text = extract_text_from_pdf(pdf_path)
    return build_vector_index(full_text, len(pages), chunk_size)
