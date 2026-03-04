"""
Models package for AI service.

This package exposes face detection and recognition utilities.
"""

from app.models.face_detector import FaceDetector
from app.models.face_recognizer import FaceRecognizer

__all__ = [
    "FaceDetector",
    "FaceRecognizer",
]
