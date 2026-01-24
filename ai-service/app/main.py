"""FastAPI application entry point"""
from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import face_router
from app.utils.config import PORT, HOST, LOG_LEVEL
from app.services.model_loader import ModelLoader
import logging
import os
import traceback

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Face Recognition API",
    description="AI Service for Face Recognition in SmartAttendance System",
    version="1.0.0"
)

# CORS middleware - configure allowed origins from environment
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:4000")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],  # Include DELETE and OPTIONS for preflight
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],  # Restrict headers
)

# Include routers
app.include_router(face_router.router)

# Import RAG router with proper error handling
rag_router_imported = False
rag_import_error = None
rag_import_error_message = None  # Store error message before exception is cleared

try:
    from app.routers.rag_router import router as rag_router
    app.include_router(rag_router)
    rag_router_imported = True
    logger.info("RAG router included successfully")
except Exception as e:
    rag_import_error = e
    rag_import_error_message = str(e)  # Store the error message before the except block exits
    # Log full exception with stack trace for debugging
    logger.error(f"Failed to import RAG router: {rag_import_error_message}")
    logger.error(f"Full traceback:\n{traceback.format_exc()}")
    logger.error("RAG functionality will be unavailable - registering fallback router with 503 response")

    # Create fallback router that returns clear error message
    fallback_router = APIRouter(prefix="/rag", tags=["RAG Chatbot (Unavailable)"])

    def rag_unavailable_response(message: str) -> JSONResponse:
        """Helper to create consistent 503 response with CORS support"""
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "error": "RAG service is unavailable",
                "message": message,
                "details": rag_import_error_message,
                "available": False
            }
        )

    @fallback_router.get("/health")
    async def rag_health_fallback():
        """Health check endpoint that indicates RAG is unavailable"""
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "error": "RAG service is unavailable due to missing dependencies or configuration",
                "details": rag_import_error_message,
                "message": "Please check server logs for more information about the startup failure",
                "available": False
            }
        )

    @fallback_router.get("/chat")
    @fallback_router.post("/chat")
    async def chat_fallback():
        """Chat endpoint that returns 503 when RAG is unavailable"""
        return rag_unavailable_response(
            "The RAG chatbot is currently unavailable due to missing dependencies or configuration. "
            "Please contact the administrator or check server logs."
        )

    @fallback_router.get("/ingest")
    @fallback_router.post("/ingest")
    async def ingest_fallback():
        """Ingest endpoint that returns 503 when RAG is unavailable"""
        return rag_unavailable_response(
            "Document ingestion is unavailable. The RAG service failed to start due to missing dependencies or configuration."
        )

    @fallback_router.get("/conversations")
    @fallback_router.post("/conversations")
    async def conversations_fallback():
        """Conversations list endpoint that returns 503 when RAG is unavailable"""
        return rag_unavailable_response(
            "Unable to retrieve or create conversations. The RAG service is currently unavailable."
        )

    @fallback_router.get("/conversation/{conversation_id}")
    async def conversation_detail_fallback(conversation_id: str):
        """Conversation detail endpoint that returns 503 when RAG is unavailable"""
        return rag_unavailable_response(
            "Unable to retrieve conversation details. The RAG service is currently unavailable."
        )

    @fallback_router.delete("/conversation/{conversation_id}")
    async def delete_conversation_fallback(conversation_id: str):
        """Delete conversation endpoint that returns 503 when RAG is unavailable"""
        return rag_unavailable_response(
            "Unable to delete conversation. The RAG service is currently unavailable."
        )

    @fallback_router.get("/search")
    async def search_fallback():
        """Search documents endpoint that returns 503 when RAG is unavailable"""
        return rag_unavailable_response(
            "Document search is unavailable. The RAG service is currently unavailable."
        )

    # Register fallback router
    app.include_router(fallback_router)
    logger.warning("Fallback RAG router registered - all /rag/* endpoints will return 503 Service Unavailable")

# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "Face Recognition API",
        "version": "1.0.0",
        "status": "running"
    }

# Health endpoint
@app.get("/health")
async def health():
    return {"status": "ok"}

# Background model loading
async def load_model_background():
    """Load InsightFace model in background"""
    try:
        logger.info("Loading InsightFace model in background...")
        model_loader = ModelLoader()
        # Run synchronous model loading in a separate thread to avoid blocking
        import asyncio
        await asyncio.to_thread(model_loader.load_model)
        logger.info("Model loaded successfully. Service is ready.")
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        logger.warning("Model loading failed - service may not function properly")

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Face Recognition API starting up...")
    logger.info(f"Server will run on {HOST}:{PORT}")

    # Load model in background task
    import asyncio
    # Save task to variable to prevent premature garbage collection
    _model_load_task = asyncio.create_task(load_model_background())

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Face Recognition API shutting down...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)


