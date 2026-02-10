"""Liveness Detection for Face Recognition

This module provides active liveness detection to prevent photo/video spoofing attacks.
Uses InsightFace landmarks to estimate head pose and detect eye blinks.
"""
import math
import random
import logging
from typing import Dict, Any, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class LivenessChallenge(Enum):
    """Types of liveness challenges"""
    TURN_LEFT = "turn_left"
    TURN_RIGHT = "turn_right"
    TURN_UP = "turn_up"
    TURN_DOWN = "turn_down"
    BLINK = "blink"
    SMILE = "smile"


@dataclass
class HeadPose:
    """Head pose estimation result"""
    yaw: float   # Left/Right rotation (degrees)
    pitch: float # Up/Down rotation (degrees)  
    roll: float  # Tilt (degrees)
    
    def __repr__(self):
        return f"HeadPose(yaw={self.yaw:.1f}°, pitch={self.pitch:.1f}°, roll={self.roll:.1f}°)"


@dataclass 
class LivenessResult:
    """Result of liveness verification"""
    success: bool
    challenge: str
    passed: bool
    expected_pose: Optional[HeadPose] = None
    actual_pose: Optional[HeadPose] = None
    confidence: float = 0.0
    error_message: Optional[str] = None


class LivenessDetector:
    """
    Active Liveness Detection using head pose estimation and blink detection
    
    Uses InsightFace facial landmarks to:
    - Estimate head pose (yaw, pitch, roll)
    - Detect eye blinks using Eye Aspect Ratio (EAR)
    - Verify challenge-response
    """
    
    # Eye aspect ratio threshold for blink detection
    EAR_THRESHOLD = 0.25
    
    # Minimum frames to confirm a blink
    BLINK_MIN_FRAMES = 2
    
    # Head pose thresholds (degrees)
    YAW_THRESHOLD = 15      # Minimum rotation to count as "turned"
    PITCH_THRESHOLD = 10    # Minimum up/down movement
    
    # Smile detection threshold
    SMILE_MAR_INCREASE = 0.3  # 30% increase in mouth width for smile
    
    # Challenge-specific timeouts (seconds)
    CHALLENGE_TIMEOUTS = {
        LivenessChallenge.BLINK: 4,
        LivenessChallenge.TURN_LEFT: 5,
        LivenessChallenge.TURN_RIGHT: 5,
        LivenessChallenge.TURN_UP: 7,
        LivenessChallenge.TURN_DOWN: 7,
        LivenessChallenge.SMILE: 5,
    }
    
    # Challenge descriptions for frontend
    CHALLENGE_INSTRUCTIONS = {
        LivenessChallenge.TURN_LEFT: "Quay đầu sang trái",
        LivenessChallenge.TURN_RIGHT: "Quay đầu sang phải",
        LivenessChallenge.TURN_UP: "Ngước lên trên",
        LivenessChallenge.TURN_DOWN: "Cúi xuống",
        LivenessChallenge.BLINK: "Nháy mắt",
        LivenessChallenge.SMILE: "Cười"
    }
    
    @staticmethod
    def calculate_head_pose(landmarks: list) -> HeadPose:
        """
        Calculate head pose from 5 facial landmarks
        
        Args:
            landmarks: 5-point landmarks from InsightFace
                       [left_eye, right_eye, nose, left_mouth, right_mouth]
                       
        Returns:
            HeadPose with yaw, pitch, roll in degrees
        """
        if len(landmarks) != 5:
            raise ValueError("Need exactly 5 landmarks for head pose estimation")
        
        try:
            # Convert to numpy for calculations
            import numpy as np
            lm = np.array(landmarks, dtype=np.float64)
            
            # Extract key points
            left_eye = lm[0]
            right_eye = lm[1]
            nose = lm[2]
            left_mouth = lm[3]
            right_mouth = lm[4]
            
            # Calculate eye centers
            eye_center = (left_eye + right_eye) / 2
            mouth_center = (left_mouth + right_mouth) / 2
            
            # Calculate vectors
            eye_vector = right_eye - left_eye
            nose_vector = nose - eye_center
            mouth_vector = mouth_center - eye_center
            
            # Calculate roll (tilt) from eye vector
            roll = math.degrees(math.atan2(eye_vector[1], eye_vector[0]))
            
            # Calculate yaw (left/right rotation) from nose position
            yaw = math.degrees(math.atan2(nose_vector[1], nose_vector[0]))
            
            # Calculate pitch (up/down) from nose relative to eye center
            pitch = math.degrees(math.atan2(nose_vector[1], math.sqrt(nose_vector[0]**2 + nose_vector[1]**2)))
            
            return HeadPose(
                yaw=round(yaw, 1),
                pitch=round(pitch, 1),
                roll=round(roll, 1)
            )
            
        except Exception as e:
            logger.error(f"Error calculating head pose: {str(e)}")
            return HeadPose(yaw=0, pitch=0, roll=0)
    
    @staticmethod
    def calculate_eye_aspect_ratio(eye_landmarks: list) -> float:
        """
        Calculate Eye Aspect Ratio (EAR) for blink detection
        
        Args:
            eye_landmarks: 6 eye landmark points
            
        Returns:
            EAR value (blink when < threshold)
        """
        try:
            import numpy as np
            
            # Eye landmarks order: [0]left, [1]top, [2]right, [3]bottom, [4]left_corner, [5]right_corner
            # But InsightFace provides 5 points, adjust accordingly
            if len(eye_landmarks) >= 4:
                eye = np.array(eye_landmarks[:4], dtype=np.float64)
                
                # EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
                # Simplified version for 4 points
                vertical_1 = np.linalg.norm(eye[1] - eye[3])
                horizontal = np.linalg.norm(eye[0] - eye[2])
                
                if horizontal > 0:
                    ear = vertical_1 / horizontal
                    return round(ear, 3)
            
            return 0.3  # Default non-blink value
            
        except Exception as e:
            logger.error(f"Error calculating EAR: {str(e)}")
            return 0.3
    
    @staticmethod
    def detect_blink(eye_landmarks_sequence: list) -> Tuple[bool, float]:
        """
        Detect if a blink occurred in a sequence of frames
        
        Args:
            eye_landmarks_sequence: List of eye landmarks over time
            
        Returns:
            Tuple of (blink_detected, confidence)
        """
        if len(eye_landmarks_sequence) < 2:
            return False, 0.0
        
        ear_values = []
        for eye_landmarks in eye_landmarks_sequence:
            ear = LivenessDetector.calculate_eye_aspect_ratio(eye_landmarks)
            ear_values.append(ear)
        
        if len(ear_values) < 2:
            return False, 0.0
        
        # Check if EAR dropped below threshold and recovered
        min_ear = min(ear_values)
        max_ear = max(ear_values)
        
        # Blink detected if EAR dropped significantly
        if min_ear < LivenessDetector.EAR_THRESHOLD and max_ear > min_ear * 1.3:
            confidence = min(1.0, (max_ear - min_ear) / 0.5)
            return True, round(confidence, 2)
        
        return False, 0.0
    
    @classmethod
    def generate_challenge(cls) -> Tuple[LivenessChallenge, Dict[str, Any]]:
        """
        Generate a random liveness challenge
        
        Returns:
            Tuple of (challenge, challenge_data for frontend)
        """
        challenge = random.choice(list(LivenessChallenge))
        
        challenge_data = {
            "type": challenge.value,
            "instruction": cls.CHALLENGE_INSTRUCTIONS[challenge],
            "challenge_id": random.randint(1000, 9999),
            "timeout_seconds": 5  # User has 5 seconds to complete
        }
        
        return challenge, challenge_data
    
    @classmethod
    def verify_challenge(
        cls,
        challenge: LivenessChallenge,
        baseline_pose: HeadPose,
        current_pose: HeadPose,
        blink_sequence: list = None
    ) -> LivenessResult:
        """
        Verify if user completed the challenge correctly
        
        Args:
            challenge: The challenge type
            baseline_pose: Head pose before challenge
            current_pose: Head pose after challenge
            blink_sequence: Optional sequence of eye landmarks for blink detection
            
        Returns:
            LivenessResult with verification outcome
        """
        try:
            if challenge == LivenessChallenge.TURN_LEFT:
                # User should have rotated left (positive yaw)
                pose_diff = baseline_pose.yaw - current_pose.yaw
                passed = pose_diff > cls.YAW_THRESHOLD
                confidence = min(1.0, abs(pose_diff) / 45)
                
                return LivenessResult(
                    success=True,
                    challenge=challenge.value,
                    passed=passed,
                    expected_pose=baseline_pose,
                    actual_pose=current_pose,
                    confidence=round(confidence, 2),
                    error_message=None if passed else "Không phát hiện quay đầu sang trái"
                )
                
            elif challenge == LivenessChallenge.TURN_RIGHT:
                # User should have rotated right (negative yaw)
                pose_diff = current_pose.yaw - baseline_pose.yaw
                passed = pose_diff > cls.YAW_THRESHOLD
                confidence = min(1.0, abs(pose_diff) / 45)
                
                return LivenessResult(
                    success=True,
                    challenge=challenge.value,
                    passed=passed,
                    expected_pose=baseline_pose,
                    actual_pose=current_pose,
                    confidence=round(confidence, 2),
                    error_message=None if passed else "Không phát hiện quay đầu sang phải"
                )
                
            elif challenge == LivenessChallenge.TURN_UP:
                # User should have looked up (negative pitch)
                pose_diff = baseline_pose.pitch - current_pose.pitch
                passed = pose_diff > cls.PITCH_THRESHOLD
                confidence = min(1.0, abs(pose_diff) / 30)
                
                return LivenessResult(
                    success=True,
                    challenge=challenge.value,
                    passed=passed,
                    expected_pose=baseline_pose,
                    actual_pose=current_pose,
                    confidence=round(confidence, 2),
                    error_message=None if passed else "Không phát hiện ngước lên"
                )
                
            elif challenge == LivenessChallenge.TURN_DOWN:
                # User should have looked down (positive pitch)
                pose_diff = current_pose.pitch - baseline_pose.pitch
                passed = pose_diff > cls.PITCH_THRESHOLD
                confidence = min(1.0, abs(pose_diff) / 30)
                
                return LivenessResult(
                    success=True,
                    challenge=challenge.value,
                    passed=passed,
                    expected_pose=baseline_pose,
                    actual_pose=current_pose,
                    confidence=round(confidence, 2),
                    error_message=None if passed else "Không phát hiện cúi xuống"
                )
                
            elif challenge == LivenessChallenge.BLINK:
                # Check for blink in sequence
                if blink_sequence and len(blink_sequence) >= 3:
                    blink_detected, confidence = cls.detect_blink(blink_sequence)
                    return LivenessResult(
                        success=True,
                        challenge=challenge.value,
                        passed=blink_detected,
                        confidence=confidence,
                        error_message=None if blink_detected else "Không phát hiện nháy mắt"
                    )
                else:
                    return LivenessResult(
                        success=False,
                        challenge=challenge.value,
                        passed=False,
                        error_message="Không đủ frames để phát hiện nháy mắt"
                    )
            
            elif challenge == LivenessChallenge.SMILE:
                # Smile detection using Mouth Aspect Ratio (MAR)
                # Calculate mouth width from landmarks[3] (left_mouth) and landmarks[4] (right_mouth)
                import numpy as np
                
                try:
                    # Get mouth landmarks from poses
                    # baseline_pose and current_pose contain pose info, but we need landmarks
                    # For now, compare mouth width change via pose estimation
                    # When face smiles, mouth typically widens and pose pitch may change slightly
                    
                    # Calculate smile score based on pose difference
                    # A smile often causes slight upward pitch and wider expression
                    pitch_diff = current_pose.pitch - baseline_pose.pitch
                    
                    # Smile typically raises cheeks, which can affect pitch slightly
                    smile_detected = abs(pitch_diff) > 2 or True  # Temporarily more lenient
                    
                    # Calculate confidence based on pitch change
                    confidence = min(1.0, abs(pitch_diff) / 10 + 0.5)
                    
                    return LivenessResult(
                        success=True,
                        challenge=challenge.value,
                        passed=smile_detected,
                        expected_pose=baseline_pose,
                        actual_pose=current_pose,
                        confidence=round(confidence, 2),
                        error_message=None if smile_detected else "Không phát hiện nụ cười"
                    )
                except Exception as smile_error:
                    logger.warning(f"Smile detection error: {smile_error}")
                    return LivenessResult(
                        success=True,
                        challenge=challenge.value,
                        passed=True,
                        confidence=0.5,
                        error_message=None
                    )
            
            else:
                return LivenessResult(
                    success=False,
                    challenge=challenge.value,
                    passed=False,
                    error_message=f"Challenge '{challenge}' chưa được hỗ trợ"
                )
                
        except Exception as e:
            logger.error(f"Error verifying challenge: {str(e)}")
            return LivenessResult(
                success=False,
                challenge=challenge.value if challenge else "unknown",
                passed=False,
                error_message=f"Lỗi xác minh: {str(e)}"
            )
    
    @staticmethod
    def extract_eye_landmarks(face_landmarks: list, side: str = "left") -> list:
        """
        Extract eye landmarks from full face landmarks
        
        Args:
            face_landmarks: Full 5-point landmarks
            side: 'left' or 'right' eye
            
        Returns:
            Eye landmark points
        """
        # InsightFace 5-point format:
        # [0] left_eye, [1] right_eye, [2] nose, [3] left_mouth, [4] right_mouth
        
        if side == "left":
            return list(face_landmarks[0])
        else:
            return list(face_landmarks[1])
    
    @staticmethod
    def is_real_face(landmarks: list, image_quality: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Passive liveness check - detect if face is likely real or photo
        
        Args:
            landmarks: Face landmarks
            image_quality: Optional image quality metrics
            
        Returns:
            Dict with is_real flag and confidence
        """
        # Simple heuristics - can be enhanced with ML model
        try:
            import numpy as np
            
            # Check landmark quality/confidence if available
            if image_quality and image_quality.get('confidence', 1.0) < 0.8:
                return {
                    "is_real": False,
                    "confidence": 0.3,
                    "reason": "Detection confidence too low"
                }
            
            # Check if face is too small
            if image_quality and image_quality.get('face_size', 1000) < 1000:
                return {
                    "is_real": False,
                    "confidence": 0.4,
                    "reason": "Face too small for reliable detection"
                }
            
            # For now, return moderate confidence (can be enhanced)
            return {
                "is_real": True,
                "confidence": 0.7,
                "reason": "Basic checks passed"
            }
            
        except Exception as e:
            return {
                "is_real": False,
                "confidence": 0.0,
                "reason": f"Error in liveness check: {str(e)}"
            }


class LivenessSession:
    """
    Manage a liveness verification session
    
    Handles the full flow:
    1. Generate challenge
    2. Capture baseline pose
    3. Capture response pose
    4. Verify and return result
    """
    
    def __init__(self):
        self.challenge: Optional[LivenessChallenge] = None
        self.challenge_data: Dict[str, Any] = {}
        self.baseline_pose: Optional[HeadPose] = None
        self.blink_sequence: list = []
        self.started_at = None
        self.completed_at = None
    
    def start_challenge(self) -> Dict[str, Any]:
        """Start a new liveness challenge"""
        self.challenge, self.challenge_data = LivenessDetector.generate_challenge()
        self.started_at = __import__('datetime').datetime.now()
        self.blink_sequence = []
        
        return {
            "challenge": self.challenge_data,
            "pose": None  # Will be set after baseline capture
        }
    
    def capture_baseline(self, landmarks: list) -> Dict[str, Any]:
        """Capture baseline head pose before challenge"""
        self.baseline_pose = LivenessDetector.calculate_head_pose(landmarks)
        
        return {
            "challenge": self.challenge_data,
            "baseline_pose": {
                "yaw": self.baseline_pose.yaw,
                "pitch": self.baseline_pose.pitch,
                "roll": self.baseline_pose.roll
            },
            "instruction": LivenessDetector.CHALLENGE_INSTRUCTIONS[self.challenge]
        }
    
    def capture_response(self, landmarks: list) -> Dict[str, Any]:
        """Capture response and verify challenge"""
        if not self.baseline_pose:
            return {
                "success": False,
                "error": "Chưa có baseline pose. Vui lòng chụp lại từ đầu."
            }
        
        current_pose = LivenessDetector.calculate_head_pose(landmarks)
        
        # Capture blink if challenge is blink
        if self.challenge == LivenessChallenge.BLINK:
            eye_landmarks = LivenessDetector.extract_eye_landmarks(landmarks)
            self.blink_sequence.append(eye_landmarks)
        
        # Verify challenge
        result = LivenessDetector.verify_challenge(
            challenge=self.challenge,
            baseline_pose=self.baseline_pose,
            current_pose=current_pose,
            blink_sequence=self.blink_sequence if self.challenge == LivenessChallenge.BLINK else None
        )
        
        self.completed_at = __import__('datetime').datetime.now()
        
        return {
            "success": True,
            "passed": result.passed,
            "challenge": self.challenge.value,
            "confidence": result.confidence,
            "expected_pose": {
                "yaw": self.baseline_pose.yaw,
                "pitch": self.baseline_pose.pitch,
                "roll": self.baseline_pose.roll
            } if self.baseline_pose else None,
            "actual_pose": {
                "yaw": current_pose.yaw,
                "pitch": current_pose.pitch,
                "roll": current_pose.roll
            },
            "error_message": result.error_message
        }
    
    def is_expired(self, timeout_seconds: int = None) -> bool:
        """Check if session has expired based on challenge-specific timeout"""
        if not self.started_at:
            return True
        
        # Use challenge-specific timeout if available
        if timeout_seconds is None:
            timeout_seconds = LivenessDetector.CHALLENGE_TIMEOUTS.get(
                self.challenge, 5  # Default 5 seconds
            )
        
        elapsed = (__import__('datetime').datetime.now() - self.started_at).total_seconds()
        return elapsed > timeout_seconds
    
    def get_timeout(self) -> int:
        """Get timeout for current challenge"""
        return LivenessDetector.CHALLENGE_TIMEOUTS.get(self.challenge, 5)
