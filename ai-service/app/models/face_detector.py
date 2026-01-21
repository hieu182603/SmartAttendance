"""Face detection using InsightFace"""
import cv2
import numpy as np
from app.services.model_loader import ModelLoader
from app.utils.config import DETECTION_THRESHOLD
import logging

logger = logging.getLogger(__name__)

class FaceDetector:
    """Detect faces in images using InsightFace"""
    
    def __init__(self):
        self.model_loader = ModelLoader()
        self.app = None
    
    def get_model(self):
        """Lazy load model"""
        if self.app is None:
            self.app = self.model_loader.load_model()
        return self.app
    
    def detect_faces(self, image: np.ndarray):
        """
        Detect faces in image
        
        Args:
            image: numpy array (BGR format from OpenCV)
            
        Returns:
            list: List of detected faces with bounding boxes and embeddings
        """
        try:
            app = self.get_model()
            faces = app.get(image)
            
            results = []
            for face in faces:
                if face.det_score >= DETECTION_THRESHOLD:
                    results.append({
                        'bbox': face.bbox.tolist(),  # [x1, y1, x2, y2]
                        'score': float(face.det_score),
                        'embedding': face.normed_embedding.tolist(),  # 512-dim vector
                        'landmark': face.landmark_2d_106.tolist() if hasattr(face, 'landmark_2d_106') else None
                    })
            
            return results
        except Exception as e:
            logger.error(f"Error detecting faces: {str(e)}")
            raise
    
    def detect_single_face(self, image: np.ndarray):
        """
        Detect exactly one face in image (for registration/verification)
        
        Returns:
            dict: Face data with detailed error information if detection fails
            {
                'success': bool,
                'face': dict (if success) or None,
                'error_code': str (if failed),
                'error_message': str (if failed),
                'detected_faces_count': int,
                'faces': list (all detected faces with details)
            }
        """
        try:
            faces = self.detect_faces(image)
            
            if len(faces) == 0:
                return {
                    'success': False,
                    'face': None,
                    'error_code': 'NO_FACE_DETECTED',
                    'error_message': 'No face detected in image. Ensure face is clearly visible and well-lit.',
                    'detected_faces_count': 0,
                    'faces': []
                }
            elif len(faces) > 1:
                # Return details about all detected faces
                face_details = []
                for idx, face in enumerate(faces):
                    face_details.append({
                        'index': idx + 1,
                        'bbox': face['bbox'],
                        'score': face['score'],
                        'confidence': round(face['score'] * 100, 2)
                    })
                
                return {
                    'success': False,
                    'face': None,
                    'error_code': 'MULTIPLE_FACES',
                    'error_message': f'Multiple faces detected ({len(faces)}). Only one face is allowed per image.',
                    'detected_faces_count': len(faces),
                    'faces': face_details
                }
            
            # Single face detected - return success with face data
            face = faces[0]
            return {
                'success': True,
                'face': {
                    'bbox': face['bbox'],
                    'score': face['score'],
                    'confidence': round(face['score'] * 100, 2),
                    'embedding': face['embedding'],
                    'landmark': face.get('landmark')
                },
                'error_code': None,
                'error_message': None,
                'detected_faces_count': 1,
                'faces': [{
                    'index': 1,
                    'bbox': face['bbox'],
                    'score': face['score'],
                    'confidence': round(face['score'] * 100, 2)
                }]
            }
        except Exception as e:
            logger.error(f"Error in detect_single_face: {str(e)}")
            return {
                'success': False,
                'face': None,
                'error_code': 'AI_SERVICE_ERROR',
                'error_message': f'Face detection error: {str(e)}',
                'detected_faces_count': 0,
                'faces': []
            }






