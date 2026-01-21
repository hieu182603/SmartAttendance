"""Business logic for face recognition operations"""
from typing import List, Optional
import numpy as np
from app.models.face_detector import FaceDetector
from app.models.face_recognizer import FaceRecognizer
from app.utils.image_utils import ImageUtils
import logging

logger = logging.getLogger(__name__)

class FaceService:
    """Service layer for face recognition operations"""
    
    def __init__(self):
        self.detector = FaceDetector()
        self.recognizer = FaceRecognizer()
        self.image_utils = ImageUtils()
    
    def register_faces(self, image_bytes_list: List[bytes]) -> dict:
        """
        Register multiple face images for a user
        
        Args:
            image_bytes_list: List of image file bytes
            
        Returns:
            dict: {
                'success': bool,
                'faces': List[dict],  # Detected faces with embeddings
                'error': str (if failed),
                'error_code': str (if failed),
                'error_details': dict (if failed)
            }
        """
        try:
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
                    }
                }
            
            return {
                'success': True,
                'faces': detected_faces,
                'total_images': len(image_bytes_list),
                'valid_faces': len(detected_faces),
                'errors': errors if errors else None,
                'error_details': error_details if error_details else None
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
    
    def verify_face(
        self,
        candidate_image_bytes: bytes,
        reference_embeddings: List[List[float]],
        custom_threshold: Optional[float] = None
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


