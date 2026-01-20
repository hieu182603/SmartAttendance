import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as tf from "@tensorflow/tfjs";

/**
 * Normalized Bounding Box Interface
 */
export interface NormalizedBoundingBox {
  topLeft: [number, number];
  bottomRight: [number, number];
}

/**
 * Face Detection Result Interface
 */
export interface FaceDetectionResult {
  faces: faceLandmarksDetection.Face[];
  isValid: boolean;
  quality: FaceQuality;
  message?: string;
}

/**
 * Face Quality Validation Result
 */
export interface FaceQuality {
  hasBothEyes: boolean;
  hasNose: boolean;
  hasMouth: boolean;
  isFullFace: boolean;
  isCentered: boolean;
  isValidSize: boolean;
  isNotCovered: boolean;
  isGoodQuality: boolean;
  score: number; // 0-1 quality score
}

/**
 * Face Position Information
 */
export interface FacePosition {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  distanceFromCenter: {
    x: number;
    y: number;
  };
  normalizedDistance: {
    x: number; // 0-1, where 0.5 is center
    y: number;
  };
}

/**
 * Configuration Options
 */
export interface FaceDetectionConfig {
  minFaceSize: number; // 0-1, relative to video size
  maxFaceSize: number; // 0-1, relative to video size
  centerThreshold: number; // 0-1, allowed distance from center
  warningThreshold: number; // 0-1, warning zone
  detectionInterval?: number; // ms between detections
}

const DEFAULT_CONFIG: FaceDetectionConfig = {
  minFaceSize: 0.3,
  maxFaceSize: 0.6,
  centerThreshold: 0.15,
  warningThreshold: 0.25,
  detectionInterval: 200,
};

/**
 * Face Detection Service
 * Wraps TensorFlow.js and MediaPipe for client-side face detection
 */
class FaceDetectionService {
  private model: faceLandmarksDetection.FaceLandmarksDetector | null = null;
  private isModelLoaded = false;
  private config: FaceDetectionConfig;
  private _hasLoggedDetectError = false;
  private _lastErrorLogTime = 0;
  private readonly ERROR_LOG_THROTTLE_MS = 5000; // Rate limit: log once every 5 seconds

  constructor(config?: Partial<FaceDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Normalize bounding box from either face.box (v2) or face.boundingBox (v1)
   * Returns normalized bounding box with topLeft and bottomRight coordinates
   */
  normalizeBoundingBox(face: faceLandmarksDetection.Face): NormalizedBoundingBox | null {
    // v2 API uses face.box with {xMin, xMax, yMin, yMax, width, height}
    if (face.box) {
      const box = face.box as { xMin?: number; xMax?: number; yMin?: number; yMax?: number; width?: number; height?: number; xCenter?: number; yCenter?: number };
      
      // Handle v2 box format with xMin, yMin, xMax, yMax
      if (box.xMin !== undefined && box.yMin !== undefined && box.xMax !== undefined && box.yMax !== undefined) {
        return {
          topLeft: [box.xMin, box.yMin],
          bottomRight: [box.xMax, box.yMax],
        };
      }
      // Handle box format with xCenter, yCenter, width, height
      if (box.xCenter !== undefined && box.yCenter !== undefined && box.width !== undefined && box.height !== undefined) {
        const halfWidth = box.width / 2;
        const halfHeight = box.height / 2;
        return {
          topLeft: [box.xCenter - halfWidth, box.yCenter - halfHeight],
          bottomRight: [box.xCenter + halfWidth, box.yCenter + halfHeight],
        };
      }
    }
    
    // v1 API uses face.boundingBox with topLeft and bottomRight
    if (face.boundingBox) {
      return {
        topLeft: face.boundingBox.topLeft,
        bottomRight: face.boundingBox.bottomRight,
      };
    }
    
    return null;
  }

  /**
   * Load the face detection model
   */
  async loadModel(): Promise<void> {
    if (this.isModelLoaded && this.model) {
      return;
    }

    try {
      // Set WebGL backend for better performance
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('TensorFlow.js backend:', tf.getBackend());

      // Version 1.x API - use createDetector with SupportedModels
      const { createDetector, SupportedModels } = faceLandmarksDetection;
      
      if (!createDetector || typeof createDetector !== 'function') {
        throw new Error("Unable to find createDetector function in face-landmarks-detection module");
      }
      
      if (!SupportedModels || !SupportedModels.MediaPipeFaceMesh) {
        throw new Error("SupportedModels.MediaPipeFaceMesh not found in face-landmarks-detection module");
      }
      
      // Create the detector using v1.x API
      // Use TF.js runtime to avoid MediaPipe WASM Module.arguments issues
      // TF.js runtime doesn't require MediaPipe WASM files, avoiding initialization errors
      this.model = await createDetector(SupportedModels.MediaPipeFaceMesh, {
        maxFaces: 1,
        runtime: 'tfjs', // Use TF.js runtime instead of mediapipe to avoid WASM issues
      });
      
      this.isModelLoaded = true;
      console.log('Face detection model loaded successfully');
    } catch (error) {
      console.error("Failed to load face detection model:", error);
      throw new Error("Không thể tải mô hình nhận diện khuôn mặt.");
    }
  }

  /**
   * Detect faces in a video element or image
   */
  async detectFace(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<faceLandmarksDetection.Face[]> {
    if (!this.model || !this.isModelLoaded) {
      throw new Error("Model chưa được tải. Vui lòng gọi loadModel() trước.");
    }

    // Validate input before processing
    if (!input) {
      throw new Error("Input không hợp lệ.");
    }

    // Add logging to understand input type (only log once per session to avoid spam)
    if (!(this as any)._hasLoggedInputType) {
      console.log('Input to detectFace:', typeof input, input?.constructor?.name, input?.tagName, input instanceof HTMLVideoElement ? (input as HTMLVideoElement).videoWidth : null, input instanceof HTMLVideoElement ? (input as HTMLVideoElement).videoHeight : null);
      (this as any)._hasLoggedInputType = true;
    }

    try {
      if (input instanceof HTMLVideoElement) {
        // Ensure video is ready and has valid dimensions
        if (input.readyState !== input.HAVE_ENOUGH_DATA || input.videoWidth === 0 || input.videoHeight === 0) {
          throw new Error("Video chưa sẵn sàng để xử lý.");
        }
        
        // Method 1: Try HTMLCanvasElement (most reliable for tfjs runtime)
        // Convert video to canvas first, then pass canvas to estimateFaces
        try {
          const canvas = document.createElement("canvas");
          canvas.width = input.videoWidth;
          canvas.height = input.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            throw new Error("Không thể tạo canvas context.");
          }
          
          // Draw video frame to canvas
          ctx.drawImage(input, 0, 0, canvas.width, canvas.height);
          
          // Use canvas directly (tfjs runtime works best with canvas)
          const faces = await this.model.estimateFaces(canvas, {
            returnTensors: false,
            flipHorizontal: true,
            predictIrises: false,
            staticImageMode: false,
          });
          
          // Debug logging (only log occasionally to avoid spam)
          if (!(this as any)._hasLoggedDetectionSuccess) {
            console.log('Face detection successful (canvas method). Faces found:', faces.length);
            (this as any)._hasLoggedDetectionSuccess = true;
          }
          
          return faces;
        } catch (canvasError) {
          // Fallback Method 2: Try video element directly
          try {
            const faces = await this.model.estimateFaces(input, {
              returnTensors: false,
              flipHorizontal: true,
              predictIrises: false,
              staticImageMode: false,
            });
            
            if (!(this as any)._hasLoggedDetectionSuccess) {
              console.log('Face detection successful (video direct method). Faces found:', faces.length);
              (this as any)._hasLoggedDetectionSuccess = true;
            }
            
            return faces;
          } catch (videoError) {
            // Fallback Method 3: Try ImageData
            const canvas = document.createElement("canvas");
            canvas.width = input.videoWidth;
            canvas.height = input.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) {
              throw new Error("Không thể tạo canvas context.");
            }
            
            ctx.drawImage(input, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const faces = await this.model.estimateFaces(imageData, {
              returnTensors: false,
              flipHorizontal: true,
              predictIrises: false,
            });
            
            if (!(this as any)._hasLoggedDetectionSuccess) {
              console.log('Face detection successful (ImageData method). Faces found:', faces.length);
              (this as any)._hasLoggedDetectionSuccess = true;
            }
            
            return faces;
          }
        }
      } else {
        // For non-video inputs (image, canvas), use directly
        const faces = await this.model.estimateFaces(input, {
          returnTensors: false,
          flipHorizontal: false,
          predictIrises: false,
        });
        return faces;
      }
    } catch (error) {
      // Only log actual errors, not expected fallbacks
      // Rate-limit error logging to prevent console spam (log at most once every 5 seconds)
      if (error instanceof Error && !error.message.includes("Video chưa sẵn sàng")) {
        const now = Date.now();
        const shouldLog = !this._hasLoggedDetectError || 
                         (now - this._lastErrorLogTime) >= this.ERROR_LOG_THROTTLE_MS;
        
        if (shouldLog) {
          console.error("Face detection error:", error);
          console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            inputType: input?.constructor?.name,
            videoReady: input instanceof HTMLVideoElement ? input.readyState : 'N/A',
            videoDimensions: input instanceof HTMLVideoElement 
              ? `${input.videoWidth}x${input.videoHeight}` 
              : 'N/A'
          });
          this._hasLoggedDetectError = true;
          this._lastErrorLogTime = now;
        }
      }
      
      // Preserve original error message for model-specific failures
      // Re-throw the original error directly to maintain error chain and model-specific messages
      // This ensures callers can reliably detect model-related failures (e.g., via error.message.includes("Model"))
      throw error;
    }
  }

  /**
   * Validate face quality based on multiple criteria
   */
  validateFaceQuality(
    face: faceLandmarksDetection.Face,
    videoWidth: number,
    videoHeight: number
  ): FaceQuality {
    const landmarks = face.keypoints || face.scaledMesh || [];
    const boundingBox = this.normalizeBoundingBox(face);

    // Check facial features visibility
    const leftEyeIndices = [33, 133, 160, 159, 158, 144, 145, 153];
    const rightEyeIndices = [362, 263, 387, 386, 385, 373, 374, 380];
    const noseIndices = [1, 2, 98, 327];
    const mouthIndices = [13, 14, 78, 308, 78, 95, 88, 178];

    const hasBothEyes =
      leftEyeIndices.some((idx) => landmarks[idx]) &&
      rightEyeIndices.some((idx) => landmarks[idx]);
    const hasNose = noseIndices.some((idx) => landmarks[idx]);
    const hasMouth = mouthIndices.some((idx) => landmarks[idx]);
    const isFullFace = hasBothEyes && hasNose && hasMouth;

    // Check if face is covered (detect if key landmarks are missing)
    const isNotCovered =
      leftEyeIndices.filter((idx) => landmarks[idx]).length >= 3 &&
      rightEyeIndices.filter((idx) => landmarks[idx]).length >= 3 &&
      noseIndices.filter((idx) => landmarks[idx]).length >= 2 &&
      mouthIndices.filter((idx) => landmarks[idx]).length >= 3;

    // Check face position and size
    let isCentered = false;
    let isValidSize = false;

    if (boundingBox) {
      const faceWidth =
        boundingBox.bottomRight[0] - boundingBox.topLeft[0];
      const faceHeight =
        boundingBox.bottomRight[1] - boundingBox.topLeft[1];
      const faceSize = Math.max(faceWidth, faceHeight);

      const minSize = Math.min(videoWidth, videoHeight) * this.config.minFaceSize;
      const maxSize = Math.min(videoWidth, videoHeight) * this.config.maxFaceSize;
      isValidSize = faceSize > minSize && faceSize < maxSize;

      const faceCenterX = (boundingBox.topLeft[0] + boundingBox.bottomRight[0]) / 2;
      const faceCenterY = (boundingBox.topLeft[1] + boundingBox.bottomRight[1]) / 2;
      const videoCenterX = videoWidth / 2;
      const videoCenterY = videoHeight / 2;

      const distanceX = Math.abs(faceCenterX - videoCenterX);
      const distanceY = Math.abs(faceCenterY - videoCenterY);

      isCentered =
        distanceX < videoWidth * this.config.centerThreshold &&
        distanceY < videoHeight * this.config.centerThreshold;
    }

    // Calculate overall quality score
    let score = 0;
    if (isFullFace) score += 0.3;
    if (hasBothEyes) score += 0.2;
    if (hasNose) score += 0.1;
    if (hasMouth) score += 0.1;
    if (isNotCovered) score += 0.1;
    if (isCentered) score += 0.1;
    if (isValidSize) score += 0.1;

    const isGoodQuality =
      isFullFace && isNotCovered && isCentered && isValidSize;

    return {
      hasBothEyes,
      hasNose,
      hasMouth,
      isFullFace,
      isCentered,
      isValidSize,
      isNotCovered,
      isGoodQuality,
      score,
    };
  }

  /**
   * Get face position information
   */
  getFacePosition(
    face: faceLandmarksDetection.Face,
    videoWidth: number,
    videoHeight: number
  ): FacePosition | null {
    const boundingBox = this.normalizeBoundingBox(face);
    if (!boundingBox) return null;

    const faceWidth = boundingBox.bottomRight[0] - boundingBox.topLeft[0];
    const faceHeight = boundingBox.bottomRight[1] - boundingBox.topLeft[1];
    const centerX = (boundingBox.topLeft[0] + boundingBox.bottomRight[0]) / 2;
    const centerY = (boundingBox.topLeft[1] + boundingBox.bottomRight[1]) / 2;

    const videoCenterX = videoWidth / 2;
    const videoCenterY = videoHeight / 2;

    const distanceFromCenter = {
      x: centerX - videoCenterX,
      y: centerY - videoCenterY,
    };

    const normalizedDistance = {
      x: Math.abs(distanceFromCenter.x) / videoWidth,
      y: Math.abs(distanceFromCenter.y) / videoHeight,
    };

    return {
      centerX,
      centerY,
      width: faceWidth,
      height: faceHeight,
      distanceFromCenter,
      normalizedDistance,
    };
  }

  /**
   * Check if multiple faces are detected (foreign object detection)
   */
  checkMultipleFaces(faces: faceLandmarksDetection.Face[]): boolean {
    return faces.length > 1;
  }

  /**
   * Dispose the model and free memory
   */
  dispose(): void {
    if (this.model) {
      try {
        // Dispose model if it has dispose method
        if (typeof (this.model as unknown as { dispose: () => void }).dispose === "function") {
          (this.model as unknown as { dispose: () => void }).dispose();
        }
      } catch (error) {
        console.warn("Error disposing model:", error);
      }
      this.model = null;
      this.isModelLoaded = false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FaceDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const faceDetectionService = new FaceDetectionService();
export default faceDetectionService;

