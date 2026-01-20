import * as blazeface from "@tensorflow-models/blazeface";
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
  faces: blazeface.NormalizedFace[];
  isValid: boolean;
  quality: FaceQuality;
  message?: string;
}

/**
 * Face Quality Validation Result
 */
export interface FaceQuality {
  isCentered: boolean;
  isValidSize: boolean;
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
 * Wraps TensorFlow.js and BlazeFace for client-side face detection
 */
class FaceDetectionService {
  private model: blazeface.BlazeFaceModel | null = null;
  private isModelLoaded = false;
  private config: FaceDetectionConfig;
  private _hasLoggedDetectError = false;
  private _lastErrorLogTime = 0;
  private readonly ERROR_LOG_THROTTLE_MS = 5000; // Rate limit: log once every 5 seconds

  constructor(config?: Partial<FaceDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Normalize bounding box from blazeface prediction
   * Returns normalized bounding box with topLeft and bottomRight coordinates
   */
  normalizeBoundingBox(face: blazeface.NormalizedFace): NormalizedBoundingBox | null {
    // BlazeFace returns predictions with topLeft and bottomRight directly
    if (face.topLeft && face.bottomRight) {
      return {
        topLeft: face.topLeft,
        bottomRight: face.bottomRight,
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

      // Load BlazeFace model
      this.model = await blazeface.load();

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
  ): Promise<blazeface.NormalizedFace[]> {
    if (!this.model || !this.isModelLoaded) {
      throw new Error("Model chưa được tải. Vui lòng gọi loadModel() trước.");
    }

    // Validate input before processing
    if (!input) {
      throw new Error("Input không hợp lệ.");
    }

    try {
      // For video inputs, ensure video is ready
      if (input instanceof HTMLVideoElement) {
        if (input.readyState !== input.HAVE_ENOUGH_DATA || input.videoWidth === 0 || input.videoHeight === 0) {
          throw new Error("Video chưa sẵn sàng để xử lý.");
        }
      }

      // BlazeFace works directly with canvas, video, and image elements
      const faces = await this.model.estimateFaces(input, false);

      // Debug logging (only log occasionally to avoid spam)
      if (!(this as any)._hasLoggedDetectionSuccess) {
        console.log('Face detection successful. Faces found:', faces.length);
        (this as any)._hasLoggedDetectionSuccess = true;
      }

      return faces;
    } catch (error) {
      // Rate-limit error logging to prevent console spam (log at most once every 5 seconds)
      const now = Date.now();
      const shouldLog = !this._hasLoggedDetectError ||
        (now - this._lastErrorLogTime) >= this.ERROR_LOG_THROTTLE_MS;

      if (shouldLog) {
        console.error("Face detection error:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : error,
          inputType: input?.constructor?.name,
        });
        this._hasLoggedDetectError = true;
        this._lastErrorLogTime = now;
      }

      throw error;
    }
  }

  /**
   * Validate face quality based on multiple criteria
   */
  validateFaceQuality(
    face: blazeface.NormalizedFace,
    videoWidth: number,
    videoHeight: number
  ): FaceQuality {
    const boundingBox = this.normalizeBoundingBox(face);

    // Check face position and size (simplified without landmarks)
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

    // Calculate overall quality score (simplified)
    let score = 0;
    if (isCentered) score += 0.5;
    if (isValidSize) score += 0.5;

    const isGoodQuality = isCentered && isValidSize;

    return {
      isCentered,
      isValidSize,
      isGoodQuality,
      score,
    };
  }

  /**
   * Get face position information
   */
  getFacePosition(
    face: blazeface.NormalizedFace,
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

