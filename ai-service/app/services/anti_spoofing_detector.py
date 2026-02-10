"""
Anti-Spoofing Detector Service

Detects presentation attacks (print photos, screen replays, video attacks)
using Silent-Face-Anti-Spoofing deep learning model.
"""

import os
import logging
import numpy as np
import cv2
import torch
import torch.nn.functional as F
from typing import Dict, Any, Optional
from pathlib import Path

from app.models.anti_spoofing_model import SilentFaceAntiSpoofing, load_pretrained_model

logger = logging.getLogger(__name__)


class AntiSpoofingDetector:
    """
    Anti-Spoofing Detector using Silent-Face-Anti-Spoofing model
    
    Detects:
    - Print attacks (printed photos)
    - Screen replay attacks (photos/videos on phone/monitor)
    - Video replay attacks
    
    Usage:
        detector = AntiSpoofingDetector()
        result = detector.predict(face_image)
        print(result['is_real'], result['confidence'])
    """
    
    # Image preprocessing constants
    IMAGE_SIZE = (224, 224)
    MEAN = np.array([0.485, 0.456, 0.406])
    STD = np.array([0.229, 0.224, 0.225])
    
    # Confidence thresholds
    DEFAULT_THRESHOLD = 0.7
    HIGH_CONFIDENCE_THRESHOLD = 0.9
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        threshold: float = DEFAULT_THRESHOLD,
        device: Optional[str] = None
    ):
        """
        Initialize Anti-Spoofing Detector
        
        Args:
            model_path: Path to pretrained model. If None, uses default path.
            threshold: Confidence threshold for real/fake classification.
            device: 'cuda' or 'cpu'. If None, auto-detects.
        """
        self.threshold = threshold
        
        # Auto-detect device
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
        
        logger.info(f"AntiSpoofingDetector using device: {self.device}")
        
        # Resolve model path
        if model_path is None:
            model_path = os.environ.get(
                "ANTI_SPOOFING_MODEL_PATH",
                str(Path(__file__).parent.parent.parent / "models" / "anti_spoofing.pth")
            )
        
        self.model_path = model_path
        
        # Load model
        self.model = self._load_model()
        
        logger.info("AntiSpoofingDetector initialized successfully")
    
    def _load_model(self) -> SilentFaceAntiSpoofing:
        """Load and initialize the anti-spoofing model"""
        try:
            model = load_pretrained_model(self.model_path, str(self.device))
            logger.info(f"Loaded anti-spoofing model from {self.model_path}")
            return model
        except Exception as e:
            logger.warning(f"Failed to load pretrained model: {e}. Using ImageNet backbone.")
            model = SilentFaceAntiSpoofing(pretrained=True)
            model.to(self.device)
            model.eval()
            return model
    
    def _preprocess(self, face_image: np.ndarray) -> torch.Tensor:
        """
        Preprocess face image for model input
        
        Args:
            face_image: Face image (BGR or RGB, any size)
            
        Returns:
            Preprocessed tensor [1, 3, 224, 224]
        """
        # Ensure RGB
        if len(face_image.shape) == 2:
            # Grayscale to RGB
            face = cv2.cvtColor(face_image, cv2.COLOR_GRAY2RGB)
        elif face_image.shape[2] == 4:
            # RGBA to RGB
            face = cv2.cvtColor(face_image, cv2.COLOR_BGRA2RGB)
        else:
            # BGR to RGB
            face = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
        
        # Resize to model input size
        face = cv2.resize(face, self.IMAGE_SIZE, interpolation=cv2.INTER_LINEAR)
        
        # Normalize to [0, 1]
        face = face.astype(np.float32) / 255.0
        
        # Apply ImageNet normalization
        face = (face - self.MEAN) / self.STD
        
        # Convert to tensor [1, 3, H, W]
        face = torch.from_numpy(face.transpose(2, 0, 1)).float()
        face = face.unsqueeze(0)
        
        return face.to(self.device)
    
    def predict(self, face_image: np.ndarray) -> Dict[str, Any]:
        """
        Predict if face image is real or spoofed
        
        Args:
            face_image: Face image (cropped face region, BGR format)
            
        Returns:
            Dict containing:
                - is_real: bool - True if face is real
                - confidence: float - Confidence score (0-1)
                - real_prob: float - Probability of being real
                - fake_prob: float - Probability of being fake
                - score: float - Difference (real_prob - fake_prob)
                - attack_type: str - 'none', 'print', 'screen', or 'video'
        """
        try:
            # Check image validity
            if face_image is None or face_image.size == 0:
                return {
                    'is_real': False,
                    'confidence': 0.0,
                    'error': 'Invalid image',
                    'error_code': 'INVALID_IMAGE'
                }
            
            # Check minimum size
            h, w = face_image.shape[:2]
            if h < 64 or w < 64:
                return {
                    'is_real': False,
                    'confidence': 0.0,
                    'error': 'Face too small for anti-spoofing',
                    'error_code': 'FACE_TOO_SMALL'
                }
            
            # Preprocess
            input_tensor = self._preprocess(face_image)
            
            # Inference
            with torch.no_grad():
                output = self.model(input_tensor)
                probs = F.softmax(output, dim=1)[0]
                
                real_prob = probs[0].item()
                fake_prob = probs[1].item()
            
            # Determine result
            is_real = real_prob > fake_prob and real_prob >= self.threshold
            confidence = max(real_prob, fake_prob)
            score = real_prob - fake_prob
            
            # Estimate attack type (heuristic)
            attack_type = 'none'
            if not is_real:
                # Could enhance with multi-class model
                attack_type = 'unknown'
            
            return {
                'is_real': is_real,
                'confidence': round(confidence, 4),
                'real_prob': round(real_prob, 4),
                'fake_prob': round(fake_prob, 4),
                'score': round(score, 4),
                'attack_type': attack_type,
                'threshold': self.threshold,
                'method': 'SFAS'
            }
            
        except Exception as e:
            logger.error(f"Anti-spoofing prediction error: {str(e)}")
            return {
                'is_real': False,
                'confidence': 0.0,
                'error': str(e),
                'error_code': 'PREDICTION_ERROR'
            }
    
    def predict_batch(self, face_images: list) -> list:
        """
        Predict for multiple face images (batch processing)
        
        Args:
            face_images: List of face images
            
        Returns:
            List of prediction results
        """
        results = []
        
        # Process in batches for efficiency
        batch_tensors = []
        valid_indices = []
        
        for i, img in enumerate(face_images):
            if img is not None and img.size > 0:
                try:
                    tensor = self._preprocess(img)
                    batch_tensors.append(tensor)
                    valid_indices.append(i)
                except Exception as e:
                    logger.warning(f"Failed to preprocess image {i}: {e}")
        
        if batch_tensors:
            # Batch inference
            batch_input = torch.cat(batch_tensors, dim=0)
            
            with torch.no_grad():
                outputs = self.model(batch_input)
                all_probs = F.softmax(outputs, dim=1)
        
        # Build results
        result_idx = 0
        for i in range(len(face_images)):
            if i in valid_indices:
                probs = all_probs[result_idx]
                real_prob = probs[0].item()
                fake_prob = probs[1].item()
                
                results.append({
                    'is_real': real_prob > fake_prob and real_prob >= self.threshold,
                    'confidence': round(max(real_prob, fake_prob), 4),
                    'real_prob': round(real_prob, 4),
                    'fake_prob': round(fake_prob, 4),
                    'method': 'SFAS'
                })
                result_idx += 1
            else:
                results.append({
                    'is_real': False,
                    'confidence': 0.0,
                    'error': 'Invalid image'
                })
        
        return results
    
    def set_threshold(self, threshold: float):
        """Update confidence threshold"""
        self.threshold = max(0.0, min(1.0, threshold))
        logger.info(f"Updated anti-spoofing threshold to {self.threshold}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            'model_path': self.model_path,
            'device': str(self.device),
            'threshold': self.threshold,
            'model_type': 'SilentFaceAntiSpoofing',
            'backbone': 'MobileNetV2',
            'input_size': self.IMAGE_SIZE
        }
