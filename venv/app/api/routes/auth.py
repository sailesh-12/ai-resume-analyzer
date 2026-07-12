"""
app/api/routes/auth.py
======================
Authentication endpoints: POST /signup, POST /login.
All business logic delegated to core/security.py and db/mongo.py.
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from app.core.security import hash_password, verify_password, create_access_token
from app.db.mongo import get_users_collection
from app.models.schemas import SignupRequest, LoginRequest, TokenResponse

router = APIRouter(tags=["Authentication"])


def _get_users_collection_or_503():
    try:
        return get_users_collection()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable right now. Check MONGO_DB_URI and MongoDB connectivity.",
        )


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(data: SignupRequest):
    """Register a new user. Returns 400 if email already exists."""
    users_collection = _get_users_collection_or_503()
    if users_collection.find_one({"email": data.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )
    users_collection.insert_one({
        "username":      data.username,
        "email":         data.email,
        "password":      hash_password(data.password),
        "date_of_birth": data.date_of_birth,
        "created_at":    datetime.utcnow(),
    })
    return {"message": "Account created successfully."}


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    """Authenticate user and return a JWT access token."""
    users_collection = _get_users_collection_or_503()
    user = users_collection.find_one({"email": data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email.",
        )
    if not verify_password(data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password.",
        )
    token = create_access_token(subject=user["email"])
    return TokenResponse(access_token=token)
