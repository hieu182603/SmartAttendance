"""Configuration settings for AI Service"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
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
MONGODB_ATLAS_URI = os.getenv("MONGODB_ATLAS_CLUSTER_URI", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
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















