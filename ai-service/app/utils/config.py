"""Configuration settings for AI Service"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file FIRST (before any pydantic parsing)
load_dotenv()

# Base paths
BASE_DIR = Path(__file__).parent.parent.parent
MODELS_DIR = BASE_DIR / "models"

# Model root directory (for InsightFace)
MODEL_ROOT = os.getenv("INSIGHTFACE_HOME", str(MODELS_DIR))

# Model config
MODEL_NAME = os.getenv("MODEL_NAME", "buffalo_l")
MODEL_PATH = os.getenv("MODEL_PATH", str(MODELS_DIR / MODEL_NAME))
DETECTION_THRESHOLD = float(os.getenv("DETECTION_THRESHOLD", "0.5"))
VERIFICATION_THRESHOLD = float(os.getenv("VERIFICATION_THRESHOLD", "0.6"))

# Server config
PORT = int(os.getenv("PORT", "8001"))
HOST = os.getenv("HOST", "0.0.0.0")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# RAG Configuration
# CRITICAL: Use os.environ.get() to get plain strings, NOT SecretStr
# This fixes the pydantic v2 SecretStr issue with google-auth
_MONGODB_URI = os.environ.get("MONGODB_ATLAS_CLUSTER_URI", "") or ""
_MONGODB_URI_PLATINUM = os.environ.get("MONGODB_ATLAS_CLUSTER_URI_PLATINUM", "") or ""
MONGODB_ATLAS_URI = _MONGODB_URI_PLATINUM if _MONGODB_URI_PLATINUM else _MONGODB_URI

# Main Application Database (for direct queries like employee count)
# Uses the same connection as RAG (MongoDB Atlas Cluster)
# If MAIN_MONGODB_URI is not set, falls back to MONGODB_ATLAS_URI
MAIN_MONGODB_URI = os.getenv("MAIN_MONGODB_URI") or MONGODB_ATLAS_URI

# For GOOGLE_API_KEY, read as raw string from environment
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

VECTOR_SEARCH_INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vector_index")
RAG_COLLECTION_NAME = os.getenv("RAG_COLLECTION_NAME", "documents")
CONVERSATIONS_COLLECTION_NAME = os.getenv("CONVERSATIONS_COLLECTION_NAME", "rag_conversations")

# Chatbot Configuration
CHATBOT_MAX_CONVERSATIONS = int(os.getenv("CHATBOT_MAX_CONVERSATIONS", "50"))
CHATBOT_MAX_MESSAGES = int(os.getenv("CHATBOT_MAX_MESSAGES", "50"))
CHATBOT_TEMPERATURE = float(os.getenv("CHATBOT_TEMPERATURE", "0.7"))
CHATBOT_MAX_TOKENS = int(os.getenv("CHATBOT_MAX_TOKENS", "2000"))

# Create models directory if not exists
MODELS_DIR.mkdir(exist_ok=True)

# Anti-Spoofing Configuration
ANTI_SPOOFING_ENABLED = os.getenv("ANTI_SPOOFING_ENABLED", "true").lower() == "true"
ANTI_SPOOFING_METHOD = os.getenv("ANTI_SPOOFING_METHOD", "hybrid")  # 'sfas', 'texture', 'hybrid'
ANTI_SPOOFING_THRESHOLD = float(os.getenv("ANTI_SPOOFING_THRESHOLD", "0.7"))
ANTI_SPOOFING_MODEL_PATH = os.getenv(
    "ANTI_SPOOFING_MODEL_PATH", 
    str(MODELS_DIR / "anti_spoofing.pth")
)

# Session Management Configuration
SESSION_STORAGE_TYPE = os.getenv("SESSION_STORAGE_TYPE", "memory")  # 'memory' or 'redis'
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
SESSION_CLEANUP_INTERVAL = int(os.getenv("SESSION_CLEANUP_INTERVAL", "60"))  # seconds

# RAG Performance Configuration
RAG_CACHE_ENABLED = os.getenv("RAG_CACHE_ENABLED", "true").lower() == "true"
RAG_CACHE_TTL = int(os.getenv("RAG_CACHE_TTL", "300"))  # seconds
RAG_CACHE_MAXSIZE = int(os.getenv("RAG_CACHE_MAXSIZE", "1000"))
RAG_CONTEXT_WINDOW = int(os.getenv("RAG_CONTEXT_WINDOW", "10"))  # messages
RAG_PARALLEL_QUERIES = os.getenv("RAG_PARALLEL_QUERIES", "true").lower() == "true"











