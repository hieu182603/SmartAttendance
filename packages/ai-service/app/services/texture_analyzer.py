"""
Texture Analyzer for Anti-Spoofing

Uses Local Binary Pattern (LBP) and Frequency Analysis (FFT) to detect
presentation attacks without requiring deep learning models.

Lightweight alternative/complement to SFAS model.
"""

import cv2
import numpy as np
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)


class TextureAnalyzer:
    """
    Texture-based presentation attack detector
    
    Uses traditional computer vision techniques:
    - LBP (Local Binary Pattern) for texture analysis
    - FFT (Fast Fourier Transform) for Moiré pattern detection
    
    Advantages:
    - Very fast (~5-10ms)
    - No GPU required
    - No model download needed
    
    Disadvantages:
    - Lower accuracy than deep learning (~80-85%)
    - More sensitive to lighting conditions
    """
    
    # LBP parameters
    LBP_RADIUS = 1
    LBP_N_POINTS = 8
    
    # Thresholds (may need tuning for specific environments)
    PRINT_ENTROPY_THRESHOLD = 3.5
    PRINT_UNIFORMITY_THRESHOLD = 0.15
    PRINT_PEAK_RATIO_THRESHOLD = 3.0
    SCREEN_FFT_THRESHOLD = 0.20
    
    def __init__(
        self,
        print_threshold: float = 0.5,
        screen_threshold: float = 0.5
    ):
        """
        Initialize Texture Analyzer
        
        Args:
            print_threshold: Confidence threshold for print detection
            screen_threshold: Confidence threshold for screen detection
        """
        self.print_threshold = print_threshold
        self.screen_threshold = screen_threshold
        
        logger.info("TextureAnalyzer initialized")
    
    def calculate_lbp(self, image: np.ndarray) -> np.ndarray:
        """
        Calculate Local Binary Pattern
        
        LBP encodes the local texture by comparing each pixel with its neighbors.
        Real faces have more complex, irregular textures.
        Printed photos have regular dot patterns.
        
        Args:
            image: Input image (grayscale or BGR)
            
        Returns:
            LBP image with same size
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Pad image for border pixels
        padded = cv2.copyMakeBorder(
            gray,
            self.LBP_RADIUS, self.LBP_RADIUS,
            self.LBP_RADIUS, self.LBP_RADIUS,
            cv2.BORDER_REFLECT
        )
        
        h, w = gray.shape
        lbp = np.zeros((h, w), dtype=np.uint8)
        
        # Calculate LBP for each pixel
        for i in range(h):
            for j in range(w):
                center = padded[i + self.LBP_RADIUS, j + self.LBP_RADIUS]
                binary_code = 0
                
                # 8 neighbors (clockwise from top-left)
                neighbors = [
                    padded[i, j],                                   # top-left
                    padded[i, j + self.LBP_RADIUS],                  # top
                    padded[i, j + 2 * self.LBP_RADIUS],              # top-right
                    padded[i + self.LBP_RADIUS, j + 2 * self.LBP_RADIUS],  # right
                    padded[i + 2 * self.LBP_RADIUS, j + 2 * self.LBP_RADIUS],  # bottom-right
                    padded[i + 2 * self.LBP_RADIUS, j + self.LBP_RADIUS],  # bottom
                    padded[i + 2 * self.LBP_RADIUS, j],              # bottom-left
                    padded[i + self.LBP_RADIUS, j],                  # left
                ]
                
                for k, neighbor in enumerate(neighbors):
                    if neighbor >= center:
                        binary_code |= (1 << k)
                
                lbp[i, j] = binary_code
        
        return lbp
    
    def calculate_lbp_fast(self, image: np.ndarray) -> np.ndarray:
        """
        Fast LBP calculation using OpenCV operations
        
        ~10x faster than calculate_lbp()
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        gray = gray.astype(np.float32)
        h, w = gray.shape
        
        # Pre-allocate output
        lbp = np.zeros((h, w), dtype=np.uint8)
        
        # Neighbor offsets (8-connectivity)
        offsets = [
            (-1, -1), (-1, 0), (-1, 1),
            (0, 1), (1, 1), (1, 0),
            (1, -1), (0, -1)
        ]
        
        # Compute LBP using vectorized operations
        for k, (dy, dx) in enumerate(offsets):
            # Shift image
            shifted = np.roll(np.roll(gray, dy, axis=0), dx, axis=1)
            
            # Compare and set bit
            mask = (shifted >= gray).astype(np.uint8)
            lbp |= (mask << k)
        
        return lbp
    
    def analyze_histogram(self, lbp: np.ndarray) -> Dict[str, float]:
        """
        Analyze LBP histogram for texture features
        
        Real faces have:
        - High entropy (complex texture)
        - Low uniformity (varied patterns)
        - Low peak ratio (distributed histogram)
        
        Printed photos have:
        - Low entropy (regular dot pattern)
        - High uniformity (repeated patterns)
        - High peak ratio (few dominant values)
        """
        # Calculate histogram
        hist, _ = np.histogram(lbp.ravel(), bins=256, range=(0, 256), density=True)
        
        # Remove zero bins for entropy calculation
        hist_nonzero = hist[hist > 0]
        
        # Shannon entropy
        entropy = -np.sum(hist_nonzero * np.log2(hist_nonzero))
        
        # Uniformity (sum of squared probabilities)
        uniformity = np.sum(hist ** 2)
        
        # Peak ratio (max value / mean value)
        mean_val = np.mean(hist)
        peak_ratio = np.max(hist) / mean_val if mean_val > 0 else 0
        
        # Variance
        variance = np.var(hist)
        
        return {
            'entropy': float(entropy),
            'uniformity': float(uniformity),
            'peak_ratio': float(peak_ratio),
            'variance': float(variance)
        }
    
    def detect_print_attack(self, face_image: np.ndarray) -> Dict[str, Any]:
        """
        Detect if face is from a printed photo
        
        Args:
            face_image: Face image (BGR format)
            
        Returns:
            Dict with detection results
        """
        try:
            # Calculate LBP
            lbp = self.calculate_lbp_fast(face_image)
            
            # Analyze histogram
            features = self.analyze_histogram(lbp)
            
            # Decision logic
            # Printed photos typically have:
            # - Lower entropy (more regular patterns)
            # - Higher uniformity (less variation)
            # - Higher peak ratio (concentrated histogram)
            
            is_print = (
                features['entropy'] < self.PRINT_ENTROPY_THRESHOLD or
                features['uniformity'] > self.PRINT_UNIFORMITY_THRESHOLD or
                features['peak_ratio'] > self.PRINT_PEAK_RATIO_THRESHOLD
            )
            
            # Calculate confidence score
            confidence = self._calculate_print_confidence(features)
            
            return {
                'is_print': is_print,
                'is_real': not is_print,
                'confidence': round(confidence, 4),
                'features': {k: round(v, 4) for k, v in features.items()},
                'method': 'LBP',
                'attack_type': 'print' if is_print else 'none'
            }
            
        except Exception as e:
            logger.error(f"Print attack detection error: {str(e)}")
            return {
                'is_print': False,
                'is_real': True,
                'confidence': 0.0,
                'error': str(e)
            }
    
    def _calculate_print_confidence(self, features: Dict[str, float]) -> float:
        """Calculate confidence score for print detection"""
        score = 0.0
        weights = {'entropy': 0.4, 'uniformity': 0.3, 'peak_ratio': 0.3}
        
        # Entropy contribution (lower = more likely print)
        if features['entropy'] < self.PRINT_ENTROPY_THRESHOLD:
            score += weights['entropy'] * (1 - features['entropy'] / self.PRINT_ENTROPY_THRESHOLD)
        
        # Uniformity contribution (higher = more likely print)
        if features['uniformity'] > self.PRINT_UNIFORMITY_THRESHOLD:
            score += weights['uniformity'] * min(features['uniformity'] / 0.3, 1.0)
        
        # Peak ratio contribution (higher = more likely print)
        if features['peak_ratio'] > self.PRINT_PEAK_RATIO_THRESHOLD:
            score += weights['peak_ratio'] * min(features['peak_ratio'] / 5.0, 1.0)
        
        return min(score, 1.0)
    
    def detect_screen_attack(self, face_image: np.ndarray) -> Dict[str, Any]:
        """
        Detect if face is from a screen/monitor (Moiré pattern detection)
        
        Screens produce Moiré patterns due to pixel grid interference
        with camera sensor. This shows up as high-frequency components.
        
        Args:
            face_image: Face image (BGR format)
            
        Returns:
            Dict with detection results
        """
        try:
            # Convert to grayscale
            if len(face_image.shape) == 3:
                gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
            else:
                gray = face_image
            
            # Apply FFT
            f = np.fft.fft2(gray.astype(np.float32))
            fshift = np.fft.fftshift(f)
            magnitude = np.abs(fshift)
            
            # Analyze frequency distribution
            h, w = magnitude.shape
            center_h, center_w = h // 2, w // 2
            
            # Create mask to separate high and low frequencies
            low_freq_radius = min(h, w) // 8
            y, x = np.ogrid[:h, :w]
            center_mask = (x - center_w) ** 2 + (y - center_h) ** 2 <= low_freq_radius ** 2
            
            # Calculate energy in different frequency bands
            low_freq_energy = np.sum(magnitude[center_mask])
            high_freq_energy = np.sum(magnitude[~center_mask])
            total_energy = np.sum(magnitude)
            
            # High frequency ratio (screens have more high-freq content)
            high_freq_ratio = high_freq_energy / total_energy if total_energy > 0 else 0
            
            # Detect Moiré patterns (periodic high-frequency peaks)
            moire_score = self._detect_moire_peaks(magnitude, center_h, center_w)
            
            # Combined screen score
            screen_score = 0.6 * high_freq_ratio + 0.4 * moire_score
            is_screen = screen_score > self.SCREEN_FFT_THRESHOLD
            
            return {
                'is_screen': is_screen,
                'is_real': not is_screen,
                'confidence': round(screen_score / self.SCREEN_FFT_THRESHOLD if is_screen else 1 - screen_score, 4),
                'high_freq_ratio': round(high_freq_ratio, 4),
                'moire_score': round(moire_score, 4),
                'method': 'FFT',
                'attack_type': 'screen' if is_screen else 'none'
            }
            
        except Exception as e:
            logger.error(f"Screen attack detection error: {str(e)}")
            return {
                'is_screen': False,
                'is_real': True,
                'confidence': 0.0,
                'error': str(e)
            }
    
    def _detect_moire_peaks(
        self,
        magnitude: np.ndarray,
        center_h: int,
        center_w: int
    ) -> float:
        """Detect periodic peaks in frequency domain (Moiré pattern indicator)"""
        # Sample high-frequency region
        sample_region = magnitude[
            center_h - center_h//2:center_h + center_h//2,
            center_w - center_w//2:center_w + center_w//2
        ]
        
        # Find local maxima
        kernel = np.ones((5, 5))
        local_max = cv2.dilate(sample_region.astype(np.float32), kernel)
        peaks = (sample_region == local_max) & (sample_region > np.mean(sample_region) * 3)
        
        # Count significant peaks
        num_peaks = np.sum(peaks)
        
        # Normalize to [0, 1]
        max_peaks = 50  # Expected max peaks for strong Moiré
        return min(num_peaks / max_peaks, 1.0)
    
    def comprehensive_check(self, face_image: np.ndarray) -> Dict[str, Any]:
        """
        Run both print and screen detection
        
        Args:
            face_image: Face image (BGR format)
            
        Returns:
            Combined detection results
        """
        # Run both checks
        print_result = self.detect_print_attack(face_image)
        screen_result = self.detect_screen_attack(face_image)
        
        # Combine results
        is_attack = print_result.get('is_print', False) or screen_result.get('is_screen', False)
        
        # Determine attack type
        if print_result.get('is_print', False):
            attack_type = 'print'
            confidence = print_result['confidence']
        elif screen_result.get('is_screen', False):
            attack_type = 'screen'
            confidence = screen_result['confidence']
        else:
            attack_type = 'none'
            # Confidence of being real = 1 - max attack confidence
            confidence = 1.0 - max(
                print_result.get('confidence', 0) if print_result.get('is_print') else 0,
                screen_result.get('confidence', 0) if screen_result.get('is_screen') else 0
            )
        
        return {
            'is_real': not is_attack,
            'is_attack': is_attack,
            'attack_type': attack_type,
            'confidence': round(confidence, 4),
            'print_detection': print_result,
            'screen_detection': screen_result,
            'method': 'LBP+FFT'
        }
