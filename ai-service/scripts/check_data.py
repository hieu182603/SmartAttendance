import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Get MongoDB URI from environment variable
uri = os.environ.get('MONGODB_ATLAS_URI')
if not uri:
    raise ValueError("MONGODB_ATLAS_URI environment variable is not set. Please set it in your .env file.")

client = MongoClient(uri)
db = client.get_database()

count = db.get_collection('rag_documents').count_documents({})
print('Collection rag_documents:', count, 'documents')

docs = db.get_collection('rag_documents').find().limit(3)
for doc in docs:
    title = doc.get('metadata', {}).get('title', 'N/A')
    print('- Title:', title)
    print('  Has embedding:', 'embedding' in doc)
