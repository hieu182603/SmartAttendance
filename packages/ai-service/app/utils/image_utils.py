"""Image processing utilities"""
import cv2
import numpy as np
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

class ImageUtils:
    """Utility functions for image processing"""
    
    @staticmethod
    def bytes_to_numpy(image_bytes: bytes) -> np.ndarray:
        """
        Convert image bytes to numpy array (BGR format for OpenCV)
        
        Args:
            image_bytes: Image file bytes
            
        Returns:
            np.ndarray: Image array (BGR format)
        """
        try:
            # Read bytes as image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert PIL to numpy array (RGB)
            rgb_array = np.array(image)
            
            # Convert RGB to BGR (OpenCV format)
            if len(rgb_array.shape) == 3:
                bgr_array = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR)
            else:
                # Grayscale image
                bgr_array = cv2.cvtColor(rgb_array, cv2.COLOR_GRAY2BGR)
            
            return bgr_array
        except Exception as e:
            logger.error(f"Error converting bytes to numpy: {str(e)}")
            raise
    
    @staticmethod
    def numpy_to_bytes(image_array: np.ndarray, format: str = 'JPEG') -> bytes:
        """
        Convert numpy array to image bytes
        
        Args:
            image_array: Image array (BGR format)
            format: Image format (JPEG, PNG)
            
        Returns:
            bytes: Image file bytes
        """
        try:
            # Convert BGR to RGB
            if len(image_array.shape) == 3:
                rgb_array = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
            else:
                rgb_array = image_array
            
            # Convert to PIL Image
            image = Image.fromarray(rgb_array)
            
            # Convert to bytes
            buffer = io.BytesIO()
            image.save(buffer, format=format)
            buffer.seek(0)
            
            return buffer.getvalue()
        except Exception as e:
            logger.error(f"Error converting numpy to bytes: {str(e)}")
            raise
    
    @staticmethod
    def resize_image(image: np.ndarray, max_size: int = 1280) -> np.ndarray:
        """
        Resize image if too large (for performance)
        
        Args:
            image: Image array
            max_size: Maximum width or height
            
        Returns:
            np.ndarray: Resized image
        """
        height, width = image.shape[:2]
        
        if max(height, width) <= max_size:
            return image
        
        # Calculate scale
        scale = max_size / max(height, width)
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        # Resize
        resized = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
        
        return resized
    
    @staticmethod
    def validate_image(
        image_bytes: bytes,
        max_size_mb: int = 10,
        min_size_mb: float = 0.01,
        min_width: int = 100,
        min_height: int = 100,
        max_width: int = 10000,
        max_height: int = 10000
    ) -> dict:
        """
        Validate image file with comprehensive quality checks
        
        Args:
            image_bytes: Image file bytes
            max_size_mb: Maximum file size in MB
            min_size_mb: Minimum file size in MB (to detect corrupted files)
            min_width: Minimum image width in pixels
            min_height: Minimum image height in pixels
            max_width: Maximum image width in pixels
            max_height: Maximum image height in pixels
            
        Returns:
            dict: {
                'valid': bool,
                'error': str (if invalid),
                'error_code': str (if invalid),
                'details': dict (resolution, size, format if valid)
            }
        """
        try:
            # Check file size (minimum)
            size_mb = len(image_bytes) / (1024 * 1024)
            if size_mb < min_size_mb:
                return {
                    'valid': False,
                    'error': f'Image file is too small ({size_mb:.3f}MB). File may be corrupted.',
                    'error_code': 'POOR_IMAGE_QUALITY',
                    'details': {
                        'file_size_mb': round(size_mb, 3),
                        'min_size_mb': min_size_mb
                    }
                }
            
            # Check file size (maximum)
            if size_mb > max_size_mb:
                return {
                    'valid': False,
                    'error': f'Image size ({size_mb:.2f}MB) exceeds maximum ({max_size_mb}MB)',
                    'error_code': 'POOR_IMAGE_QUALITY',
                    'details': {
                        'file_size_mb': round(size_mb, 2),
                        'max_size_mb': max_size_mb
                    }
                }
            
            # Try to open image
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()
            
            # Reopen image after verify (verify() closes the file)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Check format
            valid_formats = ['JPEG', 'PNG', 'WEBP']
            if image.format not in valid_formats:
                return {
                    'valid': False,
                    'error': f'Invalid image format ({image.format}). Supported: {", ".join(valid_formats)}',
                    'error_code': 'POOR_IMAGE_QUALITY',
                    'details': {
                        'format': image.format,
                        'valid_formats': valid_formats
                    }
                }
            
            # Get image dimensions
            width, height = image.size
            
            # Check resolution (minimum)
            if width < min_width or height < min_height:
                return {
                    'valid': False,
                    'error': f'Image resolution too low ({width}x{height}). Minimum: {min_width}x{min_height} pixels',
                    'error_code': 'POOR_IMAGE_QUALITY',
                    'details': {
                        'width': width,
                        'height': height,
                        'min_width': min_width,
                        'min_height': min_height
                    }
                }
            
            # Check resolution (maximum)
            if width > max_width or height > max_height:
                return {
                    'valid': False,
                    'error': f'Image resolution too high ({width}x{height}). Maximum: {max_width}x{max_height} pixels',
                    'error_code': 'POOR_IMAGE_QUALITY',
                    'details': {
                        'width': width,
                        'height': height,
                        'max_width': max_width,
                        'max_height': max_height
                    }
                }
            
            # Calculate aspect ratio (optional check for extreme ratios)
            aspect_ratio = width / height if height > 0 else 0
            if aspect_ratio < 0.1 or aspect_ratio > 10:
                return {
                    'valid': False,
                    'error': f'Image aspect ratio is too extreme ({aspect_ratio:.2f}). Image may be distorted.',
                    'error_code': 'POOR_IMAGE_QUALITY',
                    'details': {
                        'width': width,
                        'height': height,
                        'aspect_ratio': round(aspect_ratio, 2)
                    }
                }
            
            return {
                'valid': True,
                'details': {
                    'width': width,
                    'height': height,
                    'format': image.format,
                    'file_size_mb': round(size_mb, 2),
                    'aspect_ratio': round(aspect_ratio, 2)
                }
            }
            
        except Exception as e:
            return {
                'valid': False,
                'error': f'Invalid image file: {str(e)}',
                'error_code': 'POOR_IMAGE_QUALITY',
                'details': {
                    'exception': str(e)
                }
            }






