import os
from dotenv import load_dotenv
from PyPDF2 import PdfReader
import numpy as np
import faiss
import google.generativeai as genai  # Correct import
from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import tempfile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse


app=FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---------------- Load API Key ----------------

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_GEMINI_API_KEY"))

# ---------------- PDF → Vector Conversion ----------------
def pdf_to_vector_convert(filename, chunk_size=500):
    reader = PdfReader(filename)
    pdf_data = []
    full_text = ""
    for page_num, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pdf_data.append({
            "text": text,
            "page_number": page_num + 1
        })
        full_text += text

    total_pages = len(pdf_data)

    # Chunk text
    chunks = []
    chunks_metadata = []
    for i in range(0, len(full_text), chunk_size):
        chunk_text = full_text[i:i + chunk_size].strip()
        if chunk_text:
            estimated_page = min(int(i / len(full_text) * total_pages) + 1, total_pages)
            chunks.append(chunk_text)
            chunks_metadata.append({
                "start_pos": i,
                "estimated_page": estimated_page
            })

    print(f"Total chunks: {len(chunks)}")

    # Generate embeddings
    vectors = []
    for chunk in chunks:
        embed_res = genai.embed_content(
            model="gemini-embedding-001",
            content=chunk
        )
        embedding = np.array(embed_res["embedding"], dtype="float32")
        vectors.append((chunk, embedding))

    # Build FAISS index
    emb_matrix = np.array([emb for _, emb in vectors])
    d = emb_matrix.shape[1]  # Dimension
    index = faiss.IndexFlatL2(d)
    index.add(emb_matrix)
    print(f"FAISS index created with {index.ntotal} vectors.")

    return vectors, chunks_metadata, index

# ---------------- Query-aware RAG Pipeline ----------------
def query_rag_pipeline(query, vectors, index, top_k=3):
    query_embedding = genai.embed_content(
        model="gemini-embedding-001",
        content=query
    )["embedding"]

    query_vector = np.array(query_embedding, dtype="float32").reshape(1, -1)

    distances, indices = index.search(query_vector, top_k)

    # Retrieve corresponding text chunks
    retrieved_chunks = [vectors[i][0] for i in indices[0]]
    retrieved_text = "\n\n".join(retrieved_chunks)
    #print(retrieved_text)

    # Step 3: Construct a prompt for Gemini model (RAG-style)
    prompt = f"""
You are a helpful assistant for analyzing resumes for shortlisting in my company. Use the following context to answer the question.
,answer sharply to what the context is , don't give unnecessary things like explaining about the context
Context:
{retrieved_text}

Question:
{query}

Answer in a detailed and easy-to-understand way:
"""

    # Step 4: Generate the final answer using Gemini Pro
    response = genai.GenerativeModel("gemini-2.5-flash").generate_content(prompt)

    # Extract text safely
    answer = response.text if hasattr(response, "text") else str(response)

    return answer, retrieved_chunks, distances[0]
# ------------------- API Endpoint -------------------


#Api testing endpoint

@app.get("/")
def greet():
    return {"message":"Hello world"}


@app.post("/rag-query")
async def rag_query(file: UploadFile):
    # Save uploaded PDF temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
        temp.write(await file.read())
        temp_path = temp.name
        print(temp_path)
    # Process and generate response
    query="Analyze the resume and give some suggestions and rating out of 10"
    vectors, chunks,index = pdf_to_vector_convert(temp_path)
    answer, retrieved_chunks, distances = query_rag_pipeline(query, vectors, index)

    # Clean up temp file
    os.remove(temp_path)

    # Return JSON-serializable response
    result = {
        "answer": ''.join(answer.strip().split("**")),
        "retrieved_chunks": retrieved_chunks,
        "distances": list(distances) # <-- important!
    }
    clean = jsonable_encoder(result, custom_encoder={
        np.float32: float,
        np.float64: float,
        np.int32: int,
        np.int64: int,
        np.ndarray: lambda arr: arr.tolist()
    })
    return JSONResponse(content=clean)