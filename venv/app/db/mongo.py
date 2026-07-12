"""
app/db/mongo.py
===============
MongoDB connection singleton.
Call get_users_collection() wherever you need database access.
"""
from pymongo import MongoClient
from pymongo.collection import Collection

from app.core.config import settings

_client: MongoClient | None = None


def get_client() -> MongoClient:
    """Return the shared MongoClient, creating it on first call."""
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGO_URI)
    return _client


def get_users_collection() -> Collection:
    return get_client()[settings.MONGO_DB][settings.USERS_COLLECTION]
