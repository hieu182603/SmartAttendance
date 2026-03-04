import logging
from typing import Any, Dict, List, Optional

import numpy as np

from app.utils.config import VERIFICATION_THRESHOLD

logger = logging.getLogger(__name__)


class FaceRecognizer:
    """
    Performs face verification by comparing a candidate embedding
    against multiple reference embeddings.
    """

    def verify_against_multiple(
        self,
        candidate_embedding: np.ndarray,
        reference_arrays: List[np.ndarray],
        custom_threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Compare the candidate embedding with multiple reference embeddings
        using cosine similarity.

        Returns:
            {
                "match": bool,
                "similarity": float,
                "threshold": float,
            }

        On error:
            {
                "match": False,
                "similarity": 0.0,
                "threshold": float(threshold),
                "error": str(e),
                "error_code": "AI_SERVICE_ERROR",
            }
        """

        threshold = float(custom_threshold) if custom_threshold is not None else float(VERIFICATION_THRESHOLD)

        try:
            if candidate_embedding is None or len(reference_arrays) == 0:
                raise ValueError("Candidate embedding and reference arrays must be provided")

            # Ensure numpy arrays
            candidate_vec = np.asarray(candidate_embedding, dtype=np.float32)

            # L2 normalise candidate
            cand_norm = np.linalg.norm(candidate_vec)
            if cand_norm == 0:
                raise ValueError("Candidate embedding has zero norm")
            candidate_vec = candidate_vec / cand_norm

            similarities: List[float] = []
            for ref in reference_arrays:
                ref_vec = np.asarray(ref, dtype=np.float32)
                ref_norm = np.linalg.norm(ref_vec)
                if ref_norm == 0:
                    # Skip degenerate reference embeddings
                    continue
                ref_vec = ref_vec / ref_norm
                sim = float(np.dot(candidate_vec, ref_vec))
                similarities.append(sim)

            if not similarities:
                raise ValueError("No valid reference embeddings to compare against")

            best_similarity = max(similarities)

            return {
                "match": best_similarity >= threshold,
                "similarity": float(best_similarity),
                "threshold": threshold,
            }

        except Exception as e:
            logger.exception("Error during face verification: %s", e)
            return {
                "match": False,
                "similarity": 0.0,
                "threshold": threshold,
                "error": str(e),
                "error_code": "AI_SERVICE_ERROR",
            }
