from pymongo import MongoClient

import os
from dotenv import load_dotenv

load_dotenv()

Mongo_uri=os.getenv("MONGO_DB_URI")
client=MongoClient(Mongo_uri)
db=client["resume_db"]
collection=db["resume"]
print(collection)
#checking connected

try:
    client.admin.command('ping')
    print("Connected to MongoDB successfully!")
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
