import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Resolve MongoDB URI (supports both naming conventions used in config.py)
uri = (
    os.environ.get('MONGODB_ATLAS_CLUSTER_URI_PLATINUM')
    or os.environ.get('MONGODB_ATLAS_CLUSTER_URI')
    or os.environ.get('MONGODB_ATLAS_URI')
)
if not uri:
    raise ValueError(
        "MongoDB URI environment variable is not set. "
        "Please set MONGODB_ATLAS_CLUSTER_URI in your .env file."
    )

collection_name = os.environ.get('RAG_COLLECTION_NAME', 'rag_documents')

client = MongoClient(uri)
db = client.get_database()

count = db.get_collection(collection_name).count_documents({})
print(f'Collection {collection_name}:', count, 'documents')

docs = db.get_collection(collection_name).find().limit(3)
for doc in docs:
    title = doc.get('metadata', {}).get('title', 'N/A')
    print('- Title:', title)
    print('  Has embedding:', 'embedding' in doc)
