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

router = APIRouter(prefix="/api/face", tags=["Face Recognition"])

face_service = FaceService()

# Get minimum/maximum images from environment
MIN_IMAGES = int(os.getenv("MIN_REGISTRATION_IMAGES", "5"))
MAX_IMAGES = int(os.getenv("MAX_REGISTRATION_IMAGES", "5"))


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
    images: List[UploadFile] = File(...),
    liveness_success: Optional[str] = Form(None),
    liveness_passed: Optional[str] = Form(None),
    liveness_confidence: Optional[str] = Form(None),
    liveness_challenge: Optional[str] = Form(None)
):
    """
    Register face images for a user
    
    - Accepts multiple images (minimum {MIN_IMAGES}, maximum {MAX_IMAGES})
    - Each image should contain exactly one face
    - Optional liveness verification data for security
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
        
        # Prepare liveness result if provided
        liveness_result = None
        if liveness_success and liveness_passed:
            try:
                liveness_result = {
                    'success': liveness_success.lower() == 'true',
                    'passed': liveness_passed.lower() == 'true',
                    'confidence': float(liveness_confidence) if liveness_confidence else 0.0,
                    'challenge': liveness_challenge or 'unknown'
                }
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid liveness data format: {e}")
        
        # Process faces with optional liveness verification
        result = face_service.register_faces(
            image_bytes_list,
            require_liveness=True,  # BẮT BUỘC phải verify
            liveness_result=liveness_result
        )
        
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


# =========================================================================
# Liveness Detection Endpoints
# =========================================================================

class LivenessChallengeResponse(BaseModel):
    success: bool
    session_id: str
    challenge: dict
    pose: Optional[dict] = None


class LivenessBaselineResponse(BaseModel):
    success: bool
    challenge: Optional[dict] = None
    baseline_pose: Optional[dict] = None
    instruction: Optional[str] = None
    error: Optional[str] = None


class LivenessVerifyResponse(BaseModel):
    success: bool
    passed: bool
    challenge: str
    confidence: float
    expected_pose: Optional[dict] = None
    actual_pose: Optional[dict] = None
    error_message: Optional[str] = None


@router.post("/liveness/session", response_model=LivenessChallengeResponse)
async def create_liveness_session():
    """
    Create a new liveness verification session with a random challenge
    """
    try:
        import uuid
        session_id = str(uuid.uuid4())[:8]
        result = face_service.create_liveness_session(session_id)
        # Include session_id in the response
        result['session_id'] = session_id
        return LivenessChallengeResponse(**result)
    except Exception as e:
        logger.error(f"Error creating liveness session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create liveness session: {str(e)}"
        )


@router.post("/liveness/baseline/{session_id}", response_model=LivenessBaselineResponse)
async def capture_liveness_baseline(
    session_id: str,
    image: UploadFile = File(...)
):
    """
    Capture baseline pose for liveness challenge
    """
    try:
        image_bytes = await image.read()
        result = face_service.capture_liveness_baseline(session_id, image_bytes)
        return LivenessBaselineResponse(**result)
    except Exception as e:
        logger.error(f"Error capturing liveness baseline: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to capture baseline: {str(e)}"
        )


@router.post("/liveness/verify/{session_id}", response_model=LivenessVerifyResponse)
async def verify_liveness_challenge(
    session_id: str,
    image: UploadFile = File(...)
):
    """
    Verify liveness challenge response
    """
    try:
        image_bytes = await image.read()
        result = face_service.verify_liveness_response(session_id, image_bytes)
        return LivenessVerifyResponse(**result)
    except Exception as e:
        logger.error(f"Error verifying liveness: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify liveness: {str(e)}"
        )


@router.get("/liveness/instruction/{challenge_type}")
async def get_liveness_instruction(challenge_type: str):
    """
    Get human-readable instruction for a liveness challenge type
    """
    instructions = {
        'turn_left': 'Quay đầu sang trái',
        'turn_right': 'Quay đầu sang phải',
        'turn_up': 'Ngước lên trên',
        'turn_down': 'Cúi xuống',
        'blink': 'Nháy mắt',
        'smile': 'Cười'
    }
    instruction = instructions.get(challenge_type, 'Thực hiện hành động được yêu cầu')
    return {"instruction": instruction}


# =========================================================================
# Anti-Spoofing Endpoints
# =========================================================================

class AntiSpoofingResponse(BaseModel):
    is_real: bool
    confidence: float
    attack_type: Optional[str] = None
    method: Optional[str] = None
    real_prob: Optional[float] = None
    fake_prob: Optional[float] = None
    score: Optional[float] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    face_detection: Optional[dict] = None


class AntiSpoofingStatusResponse(BaseModel):
    enabled: bool
    default_method: str
    sfas_available: bool
    texture_available: bool
    sfas_info: Optional[dict] = None


@router.post("/anti-spoofing/check", response_model=AntiSpoofingResponse, dependencies=[Depends(verify_api_key)])
async def check_anti_spoofing(
    image: UploadFile = File(...),
    method: str = Form("hybrid")
):
    """
    Check if a face image is real or spoofed (without verification)
    
    Methods:
    - 'sfas': Silent-Face-Anti-Spoofing (deep learning, more accurate)
    - 'texture': Texture analysis (LBP/FFT, faster, no GPU needed)
    - 'hybrid': Combination of both methods (recommended)
    
    Returns:
    - is_real: True if face appears to be real
    - confidence: Confidence score (0-1)
    - attack_type: Type of detected attack ('print', 'screen', 'none')
    """
    try:
        image_bytes = await image.read()
        
        # Validate method
        valid_methods = ['sfas', 'texture', 'hybrid']
        if method not in valid_methods:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid method. Must be one of: {valid_methods}"
            )
        
        result = face_service.check_anti_spoofing_only(image_bytes, method)
        
        if result.get('error_code'):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=result
            )
        
        return AntiSpoofingResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in check_anti_spoofing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Anti-spoofing check failed: {str(e)}"
        )


@router.get("/anti-spoofing/status", response_model=AntiSpoofingStatusResponse)
async def get_anti_spoofing_status():
    """
    Get anti-spoofing system status
    
    Returns information about available anti-spoofing methods
    and their configuration.
    """
    return AntiSpoofingStatusResponse(**face_service.get_anti_spoofing_status())


@router.post("/verify-with-anti-spoofing", response_model=VerifyResponse, dependencies=[Depends(verify_api_key)])
async def verify_face_with_anti_spoofing(
    image: UploadFile = File(...),
    reference_embeddings_json: str = Form(...),
    threshold: Optional[float] = Form(None),
    enable_anti_spoofing: bool = Form(True),
    anti_spoofing_method: str = Form("hybrid")
):
    """
    Verify face with explicit anti-spoofing control
    
    Same as /verify but with explicit anti-spoofing parameters:
    - enable_anti_spoofing: Enable/disable anti-spoofing check
    - anti_spoofing_method: 'sfas', 'texture', or 'hybrid'
    """
    try:
        image_bytes = await image.read()
        
        # Parse reference embeddings
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
        
        verification_threshold = threshold if threshold is not None else VERIFICATION_THRESHOLD
        
        # Verify face with anti-spoofing
        result = face_service.verify_face(
            image_bytes,
            reference_embeddings,
            custom_threshold=verification_threshold,
            enable_anti_spoofing=enable_anti_spoofing,
            anti_spoofing_method=anti_spoofing_method
        )
        
        if 'error' in result:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    'match': False,
                    'error': result.get('error', 'Verification failed'),
                    'error_code': result.get('error_code', 'AI_SERVICE_ERROR'),
                    'error_details': result.get('error_details', {}),
                    'anti_spoofing': result.get('anti_spoofing')
                }
            )
        
        return VerifyResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in verify_face_with_anti_spoofing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
