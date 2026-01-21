"""Face recognition and verification using embeddings"""
import numpy as np
from typing import List
from app.utils.config import VERIFICATION_THRESHOLD
import logging

logger = logging.getLogger(__name__)

class FaceRecognizer:
    """Compare face embeddings for verification"""
    
    @staticmethod
    def cosine_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two embeddings
        
        Args:
            embedding1: numpy array (512-dim)
            embedding2: numpy array (512-dim)
            
        Returns:
            float: Similarity score (0-1, higher = more similar)
        """
        try:
            # Normalize embeddings
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            # Cosine similarity
            dot_product = np.dot(embedding1, embedding2)
            similarity = dot_product / (norm1 * norm2)
            
            # Normalize to [0, 1]
            similarity = (similarity + 1) / 2
            
            return float(similarity)
        except Exception as e:
            logger.error(f"Error calculating similarity: {str(e)}")
            return 0.0
    
    @staticmethod
    def verify_face(
        target_embedding: np.ndarray,
        candidate_embedding: np.ndarray,
        threshold: float = None
    ) -> dict:
        """
        Verify if two faces match
        
        Args:
            target_embedding: Reference face embedding
            candidate_embedding: Face to verify
            threshold: Similarity threshold (default from config)
            
        Returns:
            dict: {
                'match': bool,
                'similarity': float,
                'threshold': float
            }
        """
        if threshold is None:
            threshold = VERIFICATION_THRESHOLD
        
        similarity = FaceRecognizer.cosine_similarity(
            np.array(target_embedding),
            np.array(candidate_embedding)
        )
        
        match = similarity >= threshold
        
        return {
            'match': match,
            'similarity': similarity,
            'threshold': threshold
        }
    
    @staticmethod
    def verify_against_multiple(
        candidate_embedding: np.ndarray,
        reference_embeddings: List[np.ndarray],
        custom_threshold: float = None
    ) -> dict:
        """
        Verify face against multiple reference embeddings (best match)
        
        Args:
            candidate_embedding: Face to verify
            reference_embeddings: List of reference embeddings
            threshold: Similarity threshold
            
        Returns:
            dict: Best match result
        """
        threshold = custom_threshold if custom_threshold is not None else VERIFICATION_THRESHOLD

        best_similarity = 0.0
        best_match = False

        for ref_embedding in reference_embeddings:
            similarity = FaceRecognizer.cosine_similarity(
                np.array(candidate_embedding),
                np.array(ref_embedding)
            )

            if similarity > best_similarity:
                best_similarity = similarity

        best_match = best_similarity >= threshold

        return {
            'match': best_match,
            'similarity': best_similarity,
            'threshold': threshold
        }


