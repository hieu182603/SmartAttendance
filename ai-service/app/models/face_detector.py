import logging
from typing import Any, Dict, List, Optional

import numpy as np

from app.services.model_loader import ModelLoader

logger = logging.getLogger(__name__)


class FaceDetector:
    """
    Wrapper around the underlying InsightFace app used for face detection.

    The health check in `face_router.py` relies on `detector.app` being
    non-None to confirm the model has been loaded successfully.
    """

    def __init__(self) -> None:
        self._app: Optional[Any] = None
        try:
            loader = ModelLoader()
            self._app = loader.get_model()
            logger.info("InsightFace model loaded successfully for FaceDetector")
        except Exception as e:  # pragma: no cover - defensive logging
            self._app = None
            logger.exception("Failed to load InsightFace model in FaceDetector: %s", e)

    @property
    def app(self) -> Optional[Any]:
        """
        Expose the underlying model/app for health checks.

        Used by: `face_service.detector.app is not None`
        """

        return self._app

    def detect_single_face(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Detect exactly one face in the given image.

        Returns a structured dictionary describing the detection result:

        - No face:
            {
                "success": False,
                "error_code": "NO_FACE_DETECTED",
                "error_message": "Không phát hiện khuôn mặt trong ảnh",
                "detected_faces_count": 0,
            }
        - Multiple faces:
            {
                "success": False,
                "error_code": "MULTIPLE_FACES",
                "error_message": "Phát hiện nhiều khuôn mặt trong ảnh",
                "detected_faces_count": N,
                "faces": [...],
            }
        - Exactly one face:
            {
                "success": True,
                "face": {
                    "embedding": [...],
                    "bbox": [...],
                    "score": float,
                    "confidence": float,
                    "kps": [...],
                },
            }
        """

        try:
            if self._app is None:
                raise RuntimeError("InsightFace model is not loaded")

            faces = self._app.get(image)  # type: ignore[attr-defined]
            if not faces:
                return {
                    "success": False,
                    "error_code": "NO_FACE_DETECTED",
                    "error_message": "Không phát hiện khuôn mặt trong ảnh",
                    "detected_faces_count": 0,
                }

            # Ensure we have a list
            faces_list: List[Any] = list(faces)
            detected_count = len(faces_list)

            if detected_count != 1:
                faces_info: List[Dict[str, Any]] = []
                for face in faces_list:
                    bbox = getattr(face, "bbox", None)
                    det_score = getattr(face, "det_score", None)
                    faces_info.append(
                        {
                            "bbox": bbox.tolist() if hasattr(bbox, "tolist") else bbox,
                            "score": float(det_score) if det_score is not None else None,
                        }
                    )

                return {
                    "success": False,
                    "error_code": "MULTIPLE_FACES",
                    "error_message": "Phát hiện nhiều khuôn mặt trong ảnh",
                    "detected_faces_count": detected_count,
                    "faces": faces_info,
                }

            face = faces_list[0]

            # Prefer normalized embedding if available
            embedding = getattr(face, "normed_embedding", None)
            if embedding is None:
                embedding = getattr(face, "embedding", None)

            bbox = getattr(face, "bbox", None)
            det_score = getattr(face, "det_score", None)
            kps = getattr(face, "kps", None)

            face_payload: Dict[str, Any] = {
                "embedding": embedding.tolist() if hasattr(embedding, "tolist") else embedding,
                "bbox": bbox.tolist() if hasattr(bbox, "tolist") else bbox,
                "score": float(det_score) if det_score is not None else None,
                "confidence": float(det_score) if det_score is not None else None,
                "kps": kps.tolist() if hasattr(kps, "tolist") else kps,
            }

            return {
                "success": True,
                "face": face_payload,
            }

        except Exception as e:
            logger.exception("Error during face detection: %s", e)
            return {
                "success": False,
                "error_code": "AI_SERVICE_ERROR",
                "error_message": str(e),
                "detected_faces_count": 0,
            }