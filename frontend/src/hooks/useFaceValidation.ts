import { useState, useCallback } from 'react';
import faceDetectionService, { type FaceQuality } from '@/services/faceDetectionService';

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: string[];
  message: string;
}

export interface ImageSetValidation {
  isValid: boolean;
  averageScore: number;
  diversityScore: number;
  issues: string[];
  recommendations: string[];
}

/**
 * Hook for comprehensive face image validation
 */
export const useFaceValidation = () => {
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Validate a single captured image
   */
  const validateCapturedImage = useCallback(async (
    imageData: string,
    faceQuality: FaceQuality,
    canvas: HTMLCanvasElement
  ): Promise<ValidationResult> => {
    setIsValidating(true);

    try {
      const result = await faceDetectionService.validateCapturedImage(imageData, faceQuality, canvas);

      let message = 'Image is valid';
      if (!result.isValid) {
        const issueMessages = result.issues.map(issue => {
          switch (issue) {
            case 'too_dark': return 'Image is too dark';
            case 'too_bright': return 'Image is too bright';
            case 'low_contrast': return 'Image has low contrast';
            case 'blurry': return 'Image is blurry';
            case 'face_not_centered': return 'Face is not centered';
            case 'face_wrong_size': return 'Face size is incorrect';
            default: return issue;
          }
        });
        message = issueMessages.join(', ');
      }

      return {
        ...result,
        message
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Validate an entire set of captured images
   */
  const validateImageSet = useCallback(async (
    images: Array<{ dataURL: string; qualityScore: number }>
  ): Promise<ImageSetValidation> => {
    if (images.length === 0) {
      return {
        isValid: false,
        averageScore: 0,
        diversityScore: 0,
        issues: ['No images provided'],
        recommendations: ['Capture at least 5 images']
      };
    }

    setIsValidating(true);

    try {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Calculate average quality score
      const totalScore = images.reduce((sum, img) => sum + img.qualityScore, 0);
      const averageScore = totalScore / images.length;

      // Check minimum quality threshold
      const goodImages = images.filter(img => img.qualityScore >= 0.7);
      const qualityDistribution = goodImages.length / images.length;

      if (qualityDistribution < 0.7) {
        issues.push('Low quality image distribution');
        recommendations.push('Capture more high-quality images');
      }

      // Check diversity (avoid duplicate images)
      let diversityScore = 1;
      if (images.length > 1) {
        const similarityPromises: Promise<number>[] = [];

        for (let i = 0; i < images.length; i++) {
          for (let j = i + 1; j < images.length; j++) {
            similarityPromises.push(
              faceDetectionService.checkImageSimilarity(images[i].dataURL, images[j].dataURL)
            );
          }
        }

        const similarities = await Promise.all(similarityPromises);
        const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;

        // Diversity score is inverse of similarity (higher = more diverse)
        diversityScore = 1 - avgSimilarity;

        if (diversityScore < 0.3) {
          issues.push('Images are too similar');
          recommendations.push('Capture images from different angles and lighting conditions');
        }
      }

      // Check minimum image count
      if (images.length < 5) {
        issues.push('Insufficient images');
        recommendations.push('Capture at least 5 images');
      }

      // Face consistency check (all images should be of the same person)
      const consistencyScore = averageScore * diversityScore;

      const isValid = issues.length === 0 && consistencyScore >= 0.6;

      return {
        isValid,
        averageScore,
        diversityScore,
        issues,
        recommendations
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Get validation errors as human-readable messages
   */
  const getValidationErrors = useCallback((issues: string[]): string[] => {
    return issues.map(issue => {
      switch (issue) {
        case 'too_dark':
          return 'Ảnh quá tối. Hãy chụp ở nơi có đủ ánh sáng.';
        case 'too_bright':
          return 'Ảnh quá sáng. Hãy tránh ánh sáng trực tiếp.';
        case 'low_contrast':
          return 'Ảnh thiếu độ tương phản. Hãy cải thiện điều kiện ánh sáng.';
        case 'blurry':
          return 'Ảnh bị mờ. Hãy giữ camera ổn định khi chụp.';
        case 'face_not_centered':
          return 'Khuôn mặt không ở giữa khung hình. Hãy căn chỉnh vị trí.';
        case 'face_wrong_size':
          return 'Kích thước khuôn mặt không phù hợp. Hãy điều chỉnh khoảng cách.';
        case 'no_face':
          return 'Không phát hiện khuôn mặt trong ảnh.';
        case 'multiple_faces':
          return 'Phát hiện nhiều khuôn mặt. Chỉ chụp một khuôn mặt duy nhất.';
        case 'low_quality':
          return 'Chất lượng ảnh quá thấp.';
        default:
          return issue;
      }
    });
  }, []);

  return {
    isValidating,
    validateCapturedImage,
    validateImageSet,
    getValidationErrors
  };
};


