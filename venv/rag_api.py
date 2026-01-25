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
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime ,timedelta
import bcrypt
from jose import JWTError, jwt
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
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
    response = genai.GenerativeModel("gemini-3-flash-preview").generate_content(prompt)

    # Extract text safely
    answer = response.text if hasattr(response, "text") else str(response)

    return answer, retrieved_chunks, distances[0]
# ------------------- API Endpoint -------------------


#Api testing endpoint
#signup
#Login

#Model 
#database configuration

load_dotenv()
Mongo_uri=os.getenv("MONGO_DB_URI")
client=MongoClient(Mongo_uri)
collection=client["resume_db"]["users"]

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def hash_password(password: str):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

class UserData(BaseModel):
    username: str
    email: str
    password: str
    date_of_birth: str

class UserDataForLogin(BaseModel):
    email: str
    password: str

def create_access_token(data: dict):
    to_encode = data.copy()  #shallow copy
    expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
    
@app.get("/")
def greet():
    return {"message":"Hello world"}

@app.post("/signup")
def signup(data: UserData):
    username=data.username
    email=data.email
    password=data.password
    date_of_birth=data.date_of_birth
    hashed_password = hash_password(password)
    if collection.find_one({"email": email}):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    user = {
        "username": username,
        "email": email,
        "password": hashed_password,
        "date_of_birth": date_of_birth,
        "created_at": datetime.now()
    }
    collection.insert_one(user)
    return {"message": "User registered successfully"}


@app.post("/login")
def login(user:UserDataForLogin):
    email=user.email
    password=user.password
    user=collection.find_one({"email": email})
    #Token jwt

    if user is None:
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")
    if not verify_password(password, user["password"]):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password")
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}



def extract_score_from_analysis(analysis_text: str) -> int:
    """Extract numerical score from analysis text"""
    import re
    # Look for patterns like "rating: 7/10" or "score: 8 out of 10"
    patterns = [
        r'(?:rating|score)[\s:]*(\d+)\s*(?:/|out of)\s*10',
        r'(\d+)\s*(?:/|out of)\s*10',
    ]
    for pattern in patterns:
        match = re.search(pattern, analysis_text.lower())
        if match:
            try:
                score = int(match.group(1))
                return min(10, max(0, score))  # Clamp between 0-10
            except:
                pass
    return 0

def extract_insights(analysis_text: str) -> dict:
    """Extract structured insights from analysis"""
    import re
    
    insights = {
        "strengths": [],
        "improvements": [],
        "technical_skills": [],
        "experience_years": 0,
        "education": [],
        "format_score": 7
    }
    
    lines = analysis_text.split('\n')
    current_section = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Detect sections
        if 'strength' in line.lower():
            current_section = 'strengths'
        elif 'improve' in line.lower() or 'weakness' in line.lower() or 'suggestion' in line.lower():
            current_section = 'improvements'
        elif 'skill' in line.lower() or 'technical' in line.lower():
            current_section = 'technical_skills'
        elif 'education' in line.lower() or 'degree' in line.lower():
            current_section = 'education'
        elif current_section and (line.startswith('-') or line.startswith('•') or line.startswith('*')):
            text = line.lstrip('-•* ').strip()
            if text and current_section in insights:
                if isinstance(insights[current_section], list):
                    insights[current_section].append(text)
    
    # Extract experience years
    exp_match = re.search(r'(\d+)\s*(?:years?|yrs?)', analysis_text.lower())
    if exp_match:
        insights['experience_years'] = int(exp_match.group(1))
    
    return insights

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
    
    # Extract insights and score
    score = extract_score_from_analysis(answer)
    insights = extract_insights(answer)

    # Return JSON-serializable response
    result = {
        "answer": ''.join(answer.strip().split("**")),
        "retrieved_chunks": retrieved_chunks,
        "distances": list(distances),
        "score": score,
        "insights": insights
    }
    clean = jsonable_encoder(result, custom_encoder={
        np.float32: float,
        np.float64: float,
        np.int32: int,
        np.int64: int,
        np.ndarray: lambda arr: arr.tolist()
    })
    return JSONResponse(content=clean)

@app.post("/analyze-score")
async def analyze_score(file: UploadFile):
    """Get detailed score breakdown"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
        temp.write(await file.read())
        temp_path = temp.name
    
    try:
        vectors, chunks, index = pdf_to_vector_convert(temp_path)
        
        # Query for detailed scoring
        query = """Rate the resume on the following aspects (0-10 scale):
        1. Overall format and structure
        2. Content quality and relevance
        3. Work experience presentation
        4. Education and qualifications
        5. Skills and technical expertise
        Provide a score for each aspect."""
        
        answer, _, _ = query_rag_pipeline(query, vectors, index, top_k=5)
        
        # Parse scores (simple extraction)
        scores = {
            "format": 7,
            "content": 7,
            "experience": 7,
            "education": 7,
            "skills": 7
        }
        
        # Try to extract numbers from answer
        import re
        numbers = re.findall(r'\d+', answer)
        if len(numbers) >= 5:
            scores["format"] = int(numbers[0]) if int(numbers[0]) <= 10 else 7
            scores["content"] = int(numbers[1]) if int(numbers[1]) <= 10 else 7
            scores["experience"] = int(numbers[2]) if int(numbers[2]) <= 10 else 7
            scores["education"] = int(numbers[3]) if int(numbers[3]) <= 10 else 7
            scores["skills"] = int(numbers[4]) if int(numbers[4]) <= 10 else 7
        
        overall = sum(scores.values()) // len(scores)
        
        return {
            "overall": overall,
            "breakdown": scores,
            "details": answer
        }
    finally:
        os.remove(temp_path)

@app.post("/analyze-improvements")
async def analyze_improvements(file: UploadFile):
    """Get specific improvement suggestions"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
        temp.write(await file.read())
        temp_path = temp.name
    
    try:
        vectors, chunks, index = pdf_to_vector_convert(temp_path)
        
        query = """Provide specific, actionable improvement suggestions for this resume:
        1. Formatting improvements
        2. Content improvements
        3. Skills presentation improvements
        4. Experience section improvements
        5. Quick wins for immediate improvement
        Be concise and practical."""
        
        answer, _, _ = query_rag_pipeline(query, vectors, index, top_k=5)
        
        return {
            "improvements": answer,
            "priority_areas": extract_insights(answer)
        }
    finally:
        os.remove(temp_path)

@app.post("/analyze-strengths")
async def analyze_strengths(file: UploadFile):
    """Get strengths and highlighted aspects"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
        temp.write(await file.read())
        temp_path = temp.name
    
    try:
        vectors, chunks, index = pdf_to_vector_convert(temp_path)
        
        query = """Identify and highlight the main strengths of this resume:
        1. Key strengths shown in experience
        2. Strong skills and expertise areas
        3. Educational achievements
        4. Well-presented aspects
        5. Unique selling points
        Be specific and encouraging."""
        
        answer, _, _ = query_rag_pipeline(query, vectors, index, top_k=5)
        
        return {
            "strengths": answer,
            "highlights": extract_insights(answer)
        }
    finally:
        os.remove(temp_path)

@app.post("/analyze-metrics")
async def analyze_metrics(file: UploadFile):
    """Get comprehensive metrics about the resume"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
        temp.write(await file.read())
        temp_path = temp.name
    
    try:
        reader = PdfReader(temp_path)
        total_pages = len(reader.pages)
        
        vectors, chunks, index = pdf_to_vector_convert(temp_path)
        
        query = """Extract and count:
        1. Number of years of work experience
        2. Number of degrees/qualifications
        3. Technical skills mentioned
        4. Tools and technologies listed
        5. Projects or achievements mentioned"""
        
        answer, _, _ = query_rag_pipeline(query, vectors, index, top_k=5)
        
        return {
            "pages": total_pages,
            "chunks": len(chunks),
            "total_content_length": sum(len(c) for c in chunks),
            "details": answer
        }
    finally:
        os.remove(temp_path)