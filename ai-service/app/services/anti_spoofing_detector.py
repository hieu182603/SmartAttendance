"""
Anti-Spoofing Detector Service

Uses the real MiniFASNetV2 checkpoint from minivision-ai Silent-Face-Anti-Spoofing.
Checkpoint name encodes the crop-scale and input size, e.g. ``2.7_80x80_MiniFASNetV2.pth``:
the face bbox is expanded by 2.7x (keeping context around the face) and resized to 80x80
before inference. The model outputs 3 classes — index 1 = real, 0 and 2 = fake variants.
"""

import os
import logging
import numpy as np
import cv2
import torch
import torch.nn.functional as F
from typing import Dict, Any, Optional, Tuple
from pathlib import Path

from app.models.anti_spoofing_model import load_pretrained_model

logger = logging.getLogger(__name__)


class AntiSpoofingDetector:
    """
    MiniFASNetV2 anti-spoofing detector.

    Usage (preferred — pass full image + bbox so crop scale matches training):
        detector = AntiSpoofingDetector()
        result = detector.predict(full_image, bbox=(x1, y1, x2, y2))

    Usage (legacy — pre-cropped face, accuracy degraded):
        result = detector.predict(face_crop)
    """

    # Training-time input spec for the 2.7_80x80 checkpoint
    INPUT_SIZE = (80, 80)
    CROP_SCALE = 2.7

    # Class index convention in the minivision checkpoints
    REAL_CLASS_INDEX = 1

    DEFAULT_THRESHOLD = 0.5
    HIGH_CONFIDENCE_THRESHOLD = 0.8

    def __init__(
        self,
        model_path: Optional[str] = None,
        threshold: float = DEFAULT_THRESHOLD,
        device: Optional[str] = None,
    ):
        self.threshold = threshold

        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
        logger.info(f"AntiSpoofingDetector using device: {self.device}")

        if model_path is None:
            model_path = os.environ.get(
                "ANTI_SPOOFING_MODEL_PATH",
                str(Path(__file__).parent.parent.parent / "models" / "2.7_80x80_MiniFASNetV2.pth"),
            )
        self.model_path = model_path
        self.model = load_pretrained_model(self.model_path, str(self.device))
        logger.info(f"Loaded anti-spoofing model from {self.model_path}")

    # ------------------------------------------------------------------
    # Cropping (matches CropImage from minivision-ai repo)
    # ------------------------------------------------------------------
    def _scaled_crop(self, image: np.ndarray, bbox: Tuple[int, int, int, int]) -> np.ndarray:
        """Expand bbox by CROP_SCALE around its centre and clamp to image bounds."""
        x1, y1, x2, y2 = bbox
        src_h, src_w = image.shape[:2]
        box_w = max(1, x2 - x1)
        box_h = max(1, y2 - y1)

        scale = min((src_h - 1) / box_h, min((src_w - 1) / box_w, self.CROP_SCALE))
        new_w = box_w * scale
        new_h = box_h * scale
        cx = x1 + box_w / 2.0
        cy = y1 + box_h / 2.0

        lt_x = cx - new_w / 2.0
        lt_y = cy - new_h / 2.0
        rb_x = cx + new_w / 2.0
        rb_y = cy + new_h / 2.0

        if lt_x < 0:
            rb_x -= lt_x
            lt_x = 0
        if lt_y < 0:
            rb_y -= lt_y
            lt_y = 0
        if rb_x > src_w - 1:
            lt_x -= rb_x - src_w + 1
            rb_x = src_w - 1
        if rb_y > src_h - 1:
            lt_y -= rb_y - src_h + 1
            rb_y = src_h - 1

        return image[int(lt_y):int(rb_y) + 1, int(lt_x):int(rb_x) + 1]

    def _preprocess(self, face_patch: np.ndarray) -> torch.Tensor:
        """Resize to 80x80 and convert to tensor KEEPING pixel range [0, 255].

        The minivision checkpoint was trained with a custom ToTensor that
        explicitly removed the /255 normalisation (see their data_io/functional.py
        — the line ``return img.float().div(255)`` is commented out and replaced
        by ``return img.float()``). Dividing by 255 here breaks the model.
        Channel order stays as BGR from cv2 — matches their training pipeline.
        """
        if face_patch is None or face_patch.size == 0:
            raise ValueError("Empty face patch for preprocessing")

        resized = cv2.resize(face_patch, self.INPUT_SIZE, interpolation=cv2.INTER_LINEAR)
        tensor = torch.from_numpy(resized.transpose(2, 0, 1)).float()
        return tensor.unsqueeze(0).to(self.device)

    # ------------------------------------------------------------------
    # Public inference API
    # ------------------------------------------------------------------
    def predict(
        self,
        image: np.ndarray,
        bbox: Optional[Tuple[int, int, int, int]] = None,
    ) -> Dict[str, Any]:
        """
        Predict real vs spoof.

        Args:
            image: Full BGR image (ideal) — enables proper 2.7x context crop.
                   If ``bbox`` is None, ``image`` is treated as a pre-cropped face
                   and fed to the model directly (less accurate).
            bbox: Optional (x1, y1, x2, y2) face bounding box within ``image``.
        """
        try:
            if image is None or image.size == 0:
                return {
                    "is_real": False,
                    "confidence": 0.0,
                    "error": "Invalid image",
                    "error_code": "INVALID_IMAGE",
                }

            if bbox is not None:
                patch = self._scaled_crop(image, bbox)
            else:
                patch = image

            if patch is None or patch.size == 0 or min(patch.shape[:2]) < 10:
                return {
                    "is_real": False,
                    "confidence": 0.0,
                    "error": "Face region too small after crop",
                    "error_code": "FACE_TOO_SMALL",
                }

            input_tensor = self._preprocess(patch)

            with torch.no_grad():
                logits = self.model(input_tensor)
                probs = F.softmax(logits, dim=1)[0].cpu().numpy()

            real_prob = float(probs[self.REAL_CLASS_INDEX])
            fake_prob = float(1.0 - real_prob)
            label = int(np.argmax(probs))
            is_real = (label == self.REAL_CLASS_INDEX) and (real_prob >= self.threshold)

            return {
                "is_real": is_real,
                "confidence": round(max(real_prob, fake_prob), 4),
                "real_prob": round(real_prob, 4),
                "fake_prob": round(fake_prob, 4),
                "score": round(real_prob - fake_prob, 4),
                "attack_type": "none" if is_real else "unknown",
                "threshold": self.threshold,
                "method": "MiniFASNetV2",
                "raw_probs": [round(float(p), 4) for p in probs],
            }

        except Exception as e:
            logger.error(f"Anti-spoofing prediction error: {e}")
            return {
                "is_real": False,
                "confidence": 0.0,
                "error": str(e),
                "error_code": "PREDICTION_ERROR",
            }

    def set_threshold(self, threshold: float):
        self.threshold = max(0.0, min(1.0, threshold))
        logger.info(f"Updated anti-spoofing threshold to {self.threshold}")

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model_path": self.model_path,
            "device": str(self.device),
            "threshold": self.threshold,
            "model_type": "MiniFASNetV2",
            "input_size": self.INPUT_SIZE,
            "crop_scale": self.CROP_SCALE,
        }
