"""API endpoints for face recognition"""
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Form, Header, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional
from pydantic import BaseModel
import json
import os
from app.services.face_service import FaceService
from app.utils.config import VERIFICATION_THRESHOLD
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/face", tags=["Face Recognition"])

face_service = FaceService()

# Get minimum/maximum images from environment
MIN_IMAGES = int(os.getenv("MIN_REGISTRATION_IMAGES", "5"))
MAX_IMAGES = int(os.getenv("MAX_REGISTRATION_IMAGES", "10"))


async def verify_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """Verify API key for authentication"""
    expected_key = os.getenv("API_KEY")

    # Check for explicit development override
    allow_insecure_auth = os.getenv("ALLOW_INSECURE_AUTH", "false").lower() == "true"

    if not expected_key:
        if allow_insecure_auth:
            logger.warning("API_KEY not set but ALLOW_INSECURE_AUTH=true - allowing all requests")
            return True
        else:
            logger.error("API_KEY not set and ALLOW_INSECURE_AUTH not enabled - denying all requests")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key required"
            )

    if not x_api_key:
        logger.warning("API key missing from request")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )

    if x_api_key != expected_key:
        logger.warning(f"Invalid API key attempt from {x_api_key[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    return True


class RegisterResponse(BaseModel):
    success: bool
    faces: Optional[List[dict]] = None
    total_images: Optional[int] = None
    valid_faces: Optional[int] = None
    errors: Optional[List[str]] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    error_details: Optional[dict] = None


class VerifyResponse(BaseModel):
    match: bool
    similarity: float
    threshold: float
    error: Optional[str] = None
    error_code: Optional[str] = None
    error_details: Optional[dict] = None


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    # Check if model is loaded
    model_loaded = face_service.detector.app is not None if hasattr(face_service, 'detector') else False
    
    return {
        "status": "healthy" if model_loaded else "starting",
        "model_loaded": model_loaded,
        "service": "Face Recognition API",
        "version": "1.0.0"
    }


@router.post("/register", response_model=RegisterResponse, dependencies=[Depends(verify_api_key)])
async def register_faces(
    images: List[UploadFile] = File(...)
):
    """
    Register face images for a user
    
    - Accepts multiple images (minimum {MIN_IMAGES}, maximum {MAX_IMAGES})
    - Each image should contain exactly one face
    - Returns face embeddings for storage
    """
    try:
        if not images or len(images) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No images provided"
            )
        
        # Validate image count
        if len(images) < MIN_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Minimum {MIN_IMAGES} images required for registration. Provided: {len(images)}"
            )
        if len(images) > MAX_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum {MAX_IMAGES} images allowed. Provided: {len(images)}"
            )
        
        # Read image bytes
        image_bytes_list = []
        for image_file in images:
            content = await image_file.read()
            image_bytes_list.append(content)
        
        # Process faces
        result = face_service.register_faces(image_bytes_list)
        
        if not result['success']:
            # Return error response with error code and details
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    'success': False,
                    'error': result.get('error', 'Registration failed'),
                    'error_code': result.get('error_code', 'AI_SERVICE_ERROR'),
                    'error_details': result.get('error_details', {})
                }
            )
        
        return RegisterResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in register_faces endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/verify", response_model=VerifyResponse, dependencies=[Depends(verify_api_key)])
async def verify_face(
    image: UploadFile = File(...),
    reference_embeddings_json: str = Form(...),
    threshold: Optional[float] = Form(None)
):
    """
    Verify if a face matches reference embeddings
    
    - Accepts one candidate image
    - Requires reference_embeddings_json (JSON string) in form data
    - Optional threshold parameter to override default verification threshold
    - Returns match result with similarity score
    
    Example:
    {
        "reference_embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]]
    }
    """
    try:
        # Read image bytes
        image_bytes = await image.read()
        
        # Parse reference embeddings from JSON string
        try:
            embeddings_data = json.loads(reference_embeddings_json)
            if isinstance(embeddings_data, dict):
                reference_embeddings = embeddings_data.get('reference_embeddings', [])
            elif isinstance(embeddings_data, list):
                reference_embeddings = embeddings_data
            else:
                reference_embeddings = []
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON format for reference_embeddings"
            )
        
        if not reference_embeddings:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reference embeddings are required"
            )
        
        # Use provided threshold or fall back to config default
        verification_threshold = threshold if threshold is not None else VERIFICATION_THRESHOLD
        
        # Verify face
        result = face_service.verify_face(
            image_bytes,
            reference_embeddings,
            custom_threshold=verification_threshold
        )
        
        if 'error' in result:
            # Return error response with error code and details
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    'match': False,
                    'error': result.get('error', 'Verification failed'),
                    'error_code': result.get('error_code', 'AI_SERVICE_ERROR'),
                    'error_details': result.get('error_details', {})
                }
            )
        
        return VerifyResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in verify_face endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


