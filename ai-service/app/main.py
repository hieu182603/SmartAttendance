"""FastAPI application entry point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import face_router
from app.utils.config import PORT, HOST, LOG_LEVEL
from app.services.model_loader import ModelLoader
import logging
import os

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
    allow_methods=["GET", "POST"],  # Restrict to needed methods
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],  # Restrict headers
)

# Include routers
app.include_router(face_router.router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "Face Recognition API",
        "version": "1.0.0",
        "status": "running"
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Face Recognition API starting up...")
    logger.info(f"Server will run on {HOST}:{PORT}")
    
    # Eagerly load model during startup
    try:
        logger.info("Loading InsightFace model...")
        model_loader = ModelLoader()
        model_loader.load_model()
        logger.info("Model loaded successfully. Service is ready.")
    except Exception as e:
        logger.error(f"Failed to load model during startup: {str(e)}")
        logger.warning("Service will attempt to load model on first request")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Face Recognition API shutting down...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)


