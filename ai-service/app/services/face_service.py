"""Business logic for face recognition operations"""
from typing import List, Optional, Dict, Any
import numpy as np
import os
from app.models.face_detector import FaceDetector
from app.models.face_recognizer import FaceRecognizer
from app.utils.image_utils import ImageUtils
from app.services.liveness_detector import LivenessDetector, LivenessSession, HeadPose
from app.services.anti_spoofing_detector import AntiSpoofingDetector
from app.services.texture_analyzer import TextureAnalyzer
import logging

logger = logging.getLogger(__name__)


class FaceService:
    """Service layer for face recognition operations with Liveness Detection"""
    
    def __init__(self):
        self.detector = FaceDetector()
        self.recognizer = FaceRecognizer()
        self.image_utils = ImageUtils()
        self._liveness_sessions: Dict[str, LivenessSession] = {}
        
        # Anti-spoofing components
        self._anti_spoofing_enabled = os.getenv("ANTI_SPOOFING_ENABLED", "true").lower() == "true"
        self._anti_spoofing_method = os.getenv("ANTI_SPOOFING_METHOD", "hybrid")
        
        if self._anti_spoofing_enabled:
            try:
                self.anti_spoofing = AntiSpoofingDetector()
                logger.info("AntiSpoofingDetector initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize AntiSpoofingDetector: {e}. Falling back to texture analysis.")
                self.anti_spoofing = None
            
            self.texture_analyzer = TextureAnalyzer()
            logger.info("TextureAnalyzer initialized successfully")
        else:
            self.anti_spoofing = None
            self.texture_analyzer = None
            logger.info("Anti-spoofing is disabled")
    
    # =========================================================================
    # Liveness Detection Methods
    # =========================================================================
    
    def create_liveness_session(self, session_id: str) -> Dict[str, Any]:
        """
        Create a new liveness verification session
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Dict with challenge information for frontend
        """
        session = LivenessSession()
        self._liveness_sessions[session_id] = session

        result = session.start_challenge()
        # Ensure response matches LivenessChallengeResponse model
        result["success"] = True
        return result
    
    def capture_liveness_baseline(
        self, 
        session_id: str, 
        image_bytes: bytes
    ) -> Dict[str, Any]:
        """
        Capture baseline pose for liveness challenge
        
        Args:
            session_id: Session identifier
            image_bytes: Image bytes from frontend
            
        Returns:
            Dict with baseline pose and instruction
        """
        session = self._liveness_sessions.get(session_id)
        if not session:
            return {
                'success': False,
                'error': 'Session không tồn tại',
                'error_code': 'INVALID_SESSION'
            }
        
        if session.is_expired():
            del self._liveness_sessions[session_id]
            return {
                'success': False,
                'error': 'Session đã hết hạn',
                'error_code': 'SESSION_EXPIRED'
            }
        
        try:
            # Validate and process image
            validation = self.image_utils.validate_image(image_bytes)
            if not validation['valid']:
                return {
                    'success': False,
                    'error': validation['error'],
                    'error_code': validation.get('error_code', 'POOR_IMAGE_QUALITY')
                }
            
            image = self.image_utils.bytes_to_numpy(image_bytes)
            image = self.image_utils.resize_image(image)
            
            # Detect face
            detection_result = self.detector.detect_single_face(image)
            if not detection_result['success']:
                return {
                    'success': False,
                    'error': 'Không phát hiện khuôn mặt',
                    'error_code': 'NO_FACE_DETECTED'
                }
            
            # Extract landmarks for pose estimation
            face_data = detection_result['face']
            landmarks = face_data.get('landmark', [])
            
            if not landmarks or len(landmarks) == 0:
                # Try to get landmarks from detection result
                landmarks = face_data.get('kps', [])
            
            if not landmarks:
                return {
                    'success': False,
                    'error': 'Không lấy được landmarks',
                    'error_code': 'NO_LANDMARKS'
                }
            
            # Capture baseline pose
            result = session.capture_baseline(landmarks)
            result['success'] = True
            
            return result
            
        except Exception as e:
            logger.error(f"Error capturing liveness baseline: {str(e)}")
            return {
                'success': False,
                'error': f'Lỗi: {str(e)}',
                'error_code': 'LIVENESS_ERROR'
            }
    
    def verify_liveness_response(
        self, 
        session_id: str, 
        image_bytes: bytes
    ) -> Dict[str, Any]:
        """
        Capture response pose and verify liveness challenge
        
        Args:
            session_id: Session identifier
            image_bytes: Image bytes after challenge completion
            
        Returns:
            Dict with verification result
        """
        session = self._liveness_sessions.get(session_id)
        if not session:
            return {
                'success': False,
                'error': 'Session không tồn tại',
                'error_code': 'INVALID_SESSION'
            }
        
        if session.is_expired():
            del self._liveness_sessions[session_id]
            return {
                'success': False,
                'error': 'Session đã hết hạn',
                'error_code': 'SESSION_EXPIRED'
            }
        
        try:
            # Validate and process image
            validation = self.image_utils.validate_image(image_bytes)
            if not validation['valid']:
                return {
                    'success': False,
                    'error': validation['error'],
                    'error_code': validation.get('error_code', 'POOR_IMAGE_QUALITY')
                }
            
            image = self.image_utils.bytes_to_numpy(image_bytes)
            image = self.image_utils.resize_image(image)
            
            # Detect face
            detection_result = self.detector.detect_single_face(image)
            if not detection_result['success']:
                return {
                    'success': False,
                    'error': 'Không phát hiện khuôn mặt',
                    'error_code': 'NO_FACE_DETECTED'
                }
            
            # Extract landmarks
            face_data = detection_result['face']
            landmarks = face_data.get('landmark', [])
            
            if not landmarks:
                landmarks = face_data.get('kps', [])
            
            if not landmarks:
                return {
                    'success': False,
                    'error': 'Không lấy được landmarks',
                    'error_code': 'NO_LANDMARKS'
                }
            
            # Verify challenge
            result = session.capture_response(landmarks)
            
            # Clean up session
            del self._liveness_sessions[session_id]
            
            return result
            
        except Exception as e:
            logger.error(f"Error verifying liveness: {str(e)}")
            # Clean up on error
            if session_id in self._liveness_sessions:
                del self._liveness_sessions[session_id]
            return {
                'success': False,
                'error': f'Lỗi: {str(e)}',
                'error_code': 'LIVENESS_ERROR'
            }
    
    def get_liveness_instruction(self, challenge_type: str) -> str:
        """Get human-readable instruction for liveness challenge"""
        instructions = {
            'turn_left': 'Quay đầu sang trái',
            'turn_right': 'Quay đầu sang phải', 
            'turn_up': 'Ngước lên trên',
            'turn_down': 'Cúi xuống',
            'blink': 'Nháy mắt',
            'smile': 'Cười'
        }
        return instructions.get(challenge_type, 'Thực hiện hành động được yêu cầu')
    
    # =========================================================================
    # Face Registration Methods
    # =========================================================================
    
    def register_faces(
        self, 
        image_bytes_list: List[bytes],
        require_liveness: bool = True,
        liveness_session_id: str = None,
        liveness_result: dict = None
    ) -> dict:
        """
        Register multiple face images for a user with optional liveness verification
        
        Args:
            image_bytes_list: List of image file bytes
            require_liveness: Whether to require liveness verification
            liveness_session_id: Session ID if liveness was verified
            liveness_result: Result from liveness verification
            
        Returns:
            dict: {
                'success': bool,
                'faces': List[dict],  # Detected faces with embeddings
                'liveness': dict,     # Liveness verification result
                'error': str (if failed),
                'error_code': str (if failed),
                'error_details': dict (if failed)
            }
        """
        try:
            # Check liveness verification if required
            liveness_check = None
            if require_liveness:
                if not liveness_result or not liveness_result.get('passed'):
                    return {
                        'success': False,
                        'error': 'Vui lòng hoàn tất xác thực liveness trước khi đăng ký khuôn mặt',
                        'error_code': 'LIVENESS_REQUIRED',
                        'error_details': {
                            'liveness_verified': False
                        }
                    }
                liveness_check = {
                    'verified': True,
                    'confidence': liveness_result.get('confidence', 0.0),
                    'challenge': liveness_result.get('challenge', 'unknown')
                }
            
            if not image_bytes_list or len(image_bytes_list) == 0:
                return {
                    'success': False,
                    'error': 'No images provided',
                    'error_code': 'AI_SERVICE_ERROR',
                    'error_details': {}
                }
            
            detected_faces = []
            errors = []
            error_details = []
            
            for idx, image_bytes in enumerate(image_bytes_list):
                # Validate image
                validation = self.image_utils.validate_image(image_bytes)
                if not validation['valid']:
                    error_info = {
                        'image_index': idx + 1,
                        'error_code': validation.get('error_code', 'POOR_IMAGE_QUALITY'),
                        'error_message': validation['error'],
                        'details': validation.get('details', {})
                    }
                    errors.append(f'Image {idx + 1}: {validation["error"]}')
                    error_details.append(error_info)
                    continue
                
                # Convert to numpy
                image = self.image_utils.bytes_to_numpy(image_bytes)
                
                # Resize if too large
                image = self.image_utils.resize_image(image)
                
                # Detect face
                detection_result = self.detector.detect_single_face(image)
                
                if not detection_result['success']:
                    error_info = {
                        'image_index': idx + 1,
                        'error_code': detection_result['error_code'],
                        'error_message': detection_result['error_message'],
                        'detected_faces_count': detection_result['detected_faces_count'],
                        'faces': detection_result.get('faces', [])
                    }
                    errors.append(f'Image {idx + 1}: {detection_result["error_message"]}')
                    error_details.append(error_info)
                    continue
                
                # Successfully detected face
                face_data = detection_result['face']
                detected_faces.append({
                    'index': idx + 1,
                    'embedding': face_data['embedding'],
                    'bbox': face_data['bbox'],
                    'score': face_data['score'],
                    'confidence': face_data['confidence']
                })
            
            if len(detected_faces) == 0:
                # Determine primary error code from error details
                primary_error_code = 'AI_SERVICE_ERROR'
                if error_details:
                    # Count error codes
                    error_code_counts = {}
                    for err in error_details:
                        code = err.get('error_code', 'AI_SERVICE_ERROR')
                        error_code_counts[code] = error_code_counts.get(code, 0) + 1
                    
                    # Get most common error code
                    primary_error_code = max(error_code_counts.items(), key=lambda x: x[1])[0]
                
                return {
                    'success': False,
                    'error': f'No valid faces detected. Errors: {"; ".join(errors)}',
                    'error_code': primary_error_code,
                    'error_details': {
                        'total_images': len(image_bytes_list),
                        'valid_faces': 0,
                        'errors': error_details
                    },
                    'liveness': liveness_check
                }
            
            return {
                'success': True,
                'faces': detected_faces,
                'total_images': len(image_bytes_list),
                'valid_faces': len(detected_faces),
                'errors': errors if errors else None,
                'error_details': error_details if error_details else None,
                'liveness': liveness_check
            }
            
        except Exception as e:
            logger.error(f"Error in register_faces: {str(e)}")
            return {
                'success': False,
                'error': f'Registration failed: {str(e)}',
                'error_code': 'AI_SERVICE_ERROR',
                'error_details': {
                    'exception': str(e)
                }
            }
    
    # =========================================================================
    # Face Verification Methods
    # =========================================================================
    
    def verify_face(
        self,
        candidate_image_bytes: bytes,
        reference_embeddings: List[List[float]],
        custom_threshold: Optional[float] = None,
        enable_anti_spoofing: Optional[bool] = None,
        anti_spoofing_method: Optional[str] = None
    ) -> dict:
        """
        Verify if candidate face matches reference embeddings
        
        Args:
            candidate_image_bytes: Image to verify
            reference_embeddings: List of reference face embeddings
            custom_threshold: Optional custom threshold for verification
            
        Returns:
            dict: {
                'match': bool,
                'similarity': float,
                'threshold': float,
                'error': str (if failed),
                'error_code': str (if failed),
                'error_details': dict (if failed)
            }
        """
        try:
            # Validate image
            validation = self.image_utils.validate_image(candidate_image_bytes)
            if not validation['valid']:
                return {
                    'match': False,
                    'error': validation['error'],
                    'error_code': validation.get('error_code', 'POOR_IMAGE_QUALITY'),
                    'error_details': validation.get('details', {})
                }
            
            # Convert to numpy
            image = self.image_utils.bytes_to_numpy(candidate_image_bytes)
            image = self.image_utils.resize_image(image)
            
            # Detect face
            detection_result = self.detector.detect_single_face(image)
            
            if not detection_result['success']:
                return {
                    'match': False,
                    'error': detection_result['error_message'],
                    'error_code': detection_result['error_code'],
                    'error_details': {
                        'detected_faces_count': detection_result['detected_faces_count'],
                        'faces': detection_result.get('faces', [])
                    }
                }
            
            # Extract face data
            face_data = detection_result['face']
            
            # Anti-spoofing check
            should_check_spoofing = enable_anti_spoofing if enable_anti_spoofing is not None else self._anti_spoofing_enabled
            if should_check_spoofing:
                spoof_method = anti_spoofing_method or self._anti_spoofing_method
                
                # Crop face for anti-spoofing
                bbox = face_data['bbox']
                x1, y1, x2, y2 = map(int, bbox)
                
                # Ensure valid crop coordinates
                h, w = image.shape[:2]
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)
                
                if x2 > x1 and y2 > y1:
                    face_crop = image[y1:y2, x1:x2]
                    
                    # Run anti-spoofing check
                    spoof_result = self._check_anti_spoofing(face_crop, spoof_method)
                    
                    if not spoof_result.get('is_real', True):
                        return {
                            'match': False,
                            'error': f"Phát hiện tấn công giả mạo: {spoof_result.get('attack_type', 'unknown')}",
                            'error_code': 'SPOOF_DETECTED',
                            'anti_spoofing': spoof_result,
                            'face_detection': {
                                'bbox': face_data['bbox'],
                                'confidence': face_data['confidence']
                            }
                        }
            
            # Verify against references
            candidate_embedding = np.array(face_data['embedding'])
            reference_arrays = [np.array(emb) for emb in reference_embeddings]
            
            result = self.recognizer.verify_against_multiple(
                candidate_embedding,
                reference_arrays,
                custom_threshold=custom_threshold
            )
            
            # Add face detection details to result
            result['face_detection'] = {
                'bbox': face_data['bbox'],
                'confidence': face_data['confidence'],
                'score': face_data['score']
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error in verify_face: {str(e)}")
            return {
                'match': False,
                'error': f'Verification failed: {str(e)}',
                'error_code': 'AI_SERVICE_ERROR',
                'error_details': {
                    'exception': str(e)
                }
            }
    
    # =========================================================================
    # Utility Methods
    # =========================================================================
    
    def extract_face_landmarks(self, image_bytes: bytes) -> dict:
        """
        Extract face landmarks from an image (for debugging/analysis)
        
        Args:
            image_bytes: Image bytes
            
        Returns:
            Dict with landmarks and pose information
        """
        try:
            validation = self.image_utils.validate_image(image_bytes)
            if not validation['valid']:
                return {
                    'success': False,
                    'error': validation['error']
                }
            
            image = self.image_utils.bytes_to_numpy(image_bytes)
            image = self.image_utils.resize_image(image)
            
            detection_result = self.detector.detect_single_face(image)
            
            if not detection_result['success']:
                return {
                    'success': False,
                    'error': detection_result['error_message']
                }
            
            face_data = detection_result['face']
            landmarks = face_data.get('landmark', face_data.get('kps', []))
            
            if not landmarks:
                return {
                    'success': False,
                    'error': 'No landmarks found'
                }
            
            # Calculate head pose
            pose = LivenessDetector.calculate_head_pose(landmarks)
            
            return {
                'success': True,
                'landmarks': landmarks,
                'pose': {
                    'yaw': pose.yaw,
                    'pitch': pose.pitch,
                    'roll': pose.roll
                },
                'face_info': {
                    'bbox': face_data['bbox'],
                    'confidence': face_data['confidence']
                }
            }
            
        except Exception as e:
            logger.error(f"Error extracting landmarks: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def cleanup_expired_sessions(self, max_age_seconds: int = 30):
        """Clean up expired liveness sessions"""
        import datetime
        now = datetime.datetime.now()
        expired_sessions = []
        
        for session_id, session in self._liveness_sessions.items():
            if session.started_at:
                elapsed = (now - session.started_at).total_seconds()
                if elapsed > max_age_seconds:
                    expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            del self._liveness_sessions[session_id]
        
        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired liveness sessions")
    
    # =========================================================================
    # Anti-Spoofing Methods
    # =========================================================================
    
    def _check_anti_spoofing(
        self,
        face_crop: np.ndarray,
        method: str = "hybrid"
    ) -> Dict[str, Any]:
        """
        Internal method to check anti-spoofing
        
        Args:
            face_crop: Cropped face image
            method: 'sfas', 'texture', or 'hybrid'
            
        Returns:
            Anti-spoofing result dict
        """
        if method == "sfas":
            if self.anti_spoofing:
                return self.anti_spoofing.predict(face_crop)
            else:
                # Fallback to texture if SFAS not available
                return self.texture_analyzer.comprehensive_check(face_crop)
        
        elif method == "texture":
            if self.texture_analyzer:
                return self.texture_analyzer.comprehensive_check(face_crop)
            else:
                return {'is_real': True, 'confidence': 0.0, 'error': 'TextureAnalyzer not initialized'}
        
        else:  # hybrid
            # Use both methods and combine results
            sfas_result = None
            texture_result = None
            
            if self.texture_analyzer:
                texture_result = self.texture_analyzer.comprehensive_check(face_crop)
                
                # If texture analysis is highly confident, trust it
                if texture_result.get('confidence', 0) > 0.85:
                    return texture_result
            
            if self.anti_spoofing:
                sfas_result = self.anti_spoofing.predict(face_crop)
                
                # SFAS is more reliable, use as primary
                return sfas_result
            
            # Fallback to texture result
            if texture_result:
                return texture_result
            
            return {'is_real': True, 'confidence': 0.0, 'error': 'No anti-spoofing method available'}
    
    def check_anti_spoofing_only(
        self,
        image_bytes: bytes,
        method: str = "hybrid"
    ) -> Dict[str, Any]:
        """
        Check anti-spoofing without face verification
        
        Useful for testing anti-spoofing separately.
        
        Args:
            image_bytes: Image bytes
            method: 'sfas', 'texture', or 'hybrid'
            
        Returns:
            Anti-spoofing result dict
        """
        try:
            # Validate image
            validation = self.image_utils.validate_image(image_bytes)
            if not validation['valid']:
                return {
                    'is_real': False,
                    'error': validation['error'],
                    'error_code': 'INVALID_IMAGE'
                }
            
            # Convert to numpy
            image = self.image_utils.bytes_to_numpy(image_bytes)
            image = self.image_utils.resize_image(image)
            
            # Detect face
            detection_result = self.detector.detect_single_face(image)
            
            if not detection_result['success']:
                return {
                    'is_real': False,
                    'error': detection_result['error_message'],
                    'error_code': 'NO_FACE_DETECTED'
                }
            
            # Crop face
            face_data = detection_result['face']
            bbox = face_data['bbox']
            x1, y1, x2, y2 = map(int, bbox)
            
            h, w = image.shape[:2]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            
            face_crop = image[y1:y2, x1:x2]
            
            # Run anti-spoofing
            result = self._check_anti_spoofing(face_crop, method)
            result['face_detection'] = {
                'bbox': face_data['bbox'],
                'confidence': face_data['confidence']
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error in check_anti_spoofing_only: {str(e)}")
            return {
                'is_real': False,
                'error': str(e),
                'error_code': 'ANTI_SPOOFING_ERROR'
            }
    
    def get_anti_spoofing_status(self) -> Dict[str, Any]:
        """Get anti-spoofing system status"""
        return {
            'enabled': self._anti_spoofing_enabled,
            'default_method': self._anti_spoofing_method,
            'sfas_available': self.anti_spoofing is not None,
            'texture_available': self.texture_analyzer is not None,
            'sfas_info': self.anti_spoofing.get_model_info() if self.anti_spoofing else None
        }

