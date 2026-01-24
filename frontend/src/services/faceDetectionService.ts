// Dynamic imports for TensorFlow.js - loaded only when needed
let blazeface: typeof import("@tensorflow-models/blazeface") | null = null;
let tf: typeof import("@tensorflow/tfjs") | null = null;

const loadTensorFlow = async () => {
  if (!blazeface || !tf) {
    const [tfModule, blazefaceModule] = await Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/blazeface')
    ]);
    tf = tfModule;
    blazeface = blazefaceModule;
  }
  return { tf, blazeface };
};

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
  faces: any[];
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
  private model: any | null = null;
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
  normalizeBoundingBox(face: any): NormalizedBoundingBox | null {
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
      // Dynamically load TensorFlow.js and BlazeFace
      const { tf: tfModule, blazeface: blazefaceModule } = await loadTensorFlow();
      
      // Set WebGL backend for better performance
      await tfModule.setBackend('webgl');
      await tfModule.ready();
      console.log('TensorFlow.js backend:', tfModule.getBackend());

      // Load BlazeFace model
      this.model = await blazefaceModule.load();

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
  ): Promise<any[]> {
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
    face: any,
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
    face: any,
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
  checkMultipleFaces(faces: any[]): boolean {
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
   * Calculate image sharpness using Laplacian variance
   */
  calculateImageSharpness(imageData: ImageData): number {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Convert to grayscale and calculate Laplacian
    const laplacian = new Float32Array((width - 2) * (height - 2));

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        // Laplacian kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
        const laplacianIdx = ((y - 1) * (width - 2)) + (x - 1);
        laplacian[laplacianIdx] =
          -4 * gray +
          (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3 +
          (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3 +
          (data[(y * width + (x - 1)) * 4] + data[(y * width + (x - 1)) * 4 + 1] + data[(y * width + (x - 1)) * 4 + 2]) / 3 +
          (data[(y * width + (x + 1)) * 4] + data[(y * width + (x + 1)) * 4 + 1] + data[(y * width + (x + 1)) * 4 + 2]) / 3;
      }
    }

    // Calculate variance
    const mean = laplacian.reduce((sum, val) => sum + val, 0) / laplacian.length;
    const variance = laplacian.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / laplacian.length;

    return variance;
  }

  /**
   * Analyze image brightness and contrast
   */
  analyzeBrightness(imageData: ImageData): { mean: number, histogram: number[], contrast: number } {
    const data = imageData.data;
    const histogram = new Array(256).fill(0);
    let sum = 0;

    // Calculate histogram and mean brightness
    for (let i = 0; i < data.length; i += 4) {
      const brightness = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[brightness]++;
      sum += brightness;
    }

    const mean = sum / (data.length / 4);

    // Calculate contrast (standard deviation)
    let contrastSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      contrastSum += Math.pow(brightness - mean, 2);
    }
    const contrast = Math.sqrt(contrastSum / (data.length / 4));

    return { mean, histogram, contrast };
  }

  /**
   * Detect blur using FFT-based approach (simplified)
   */
  detectBlur(canvas: HTMLCanvasElement): number {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 1;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Use Laplacian variance as blur metric (higher = sharper)
    const sharpness = this.calculateImageSharpness(imageData);

    // Normalize to 0-1 scale (lower values = more blur)
    // Typical range: 0-1000, good images usually > 100
    const blurScore = Math.min(sharpness / 200, 1);

    return blurScore;
  }

  /**
   * Check similarity between two images using simple histogram comparison
   */
  checkImageSimilarity(img1: string, img2: string): Promise<number> {
    return new Promise((resolve) => {
      const canvas1 = document.createElement('canvas');
      const canvas2 = document.createElement('canvas');
      const ctx1 = canvas1.getContext('2d');
      const ctx2 = canvas2.getContext('2d');

      if (!ctx1 || !ctx2) {
        resolve(0);
        return;
      }

      const img1El = new Image();
      const img2El = new Image();

      let loadedCount = 0;
      const onLoad = () => {
        loadedCount++;
        if (loadedCount === 2) {
          // Resize to smaller size for faster comparison
          const size = 64;
          canvas1.width = canvas1.height = size;
          canvas2.width = canvas2.height = size;

          ctx1.drawImage(img1El, 0, 0, size, size);
          ctx2.drawImage(img2El, 0, 0, size, size);

          const data1 = ctx1.getImageData(0, 0, size, size);
          const data2 = ctx2.getImageData(0, 0, size, size);

          const hist1 = this.analyzeBrightness(data1);
          const hist2 = this.analyzeBrightness(data2);

          // Calculate histogram intersection
          let intersection = 0;
          const total = data1.data.length / 4; // Total pixels

          for (let i = 0; i < 256; i++) {
            intersection += Math.min(hist1.histogram[i], hist2.histogram[i]);
          }

          const similarity = intersection / total;
          resolve(similarity);
        }
      };

      img1El.onload = onLoad;
      img2El.onload = onLoad;
      img1El.src = img1;
      img2El.src = img2;
    });
  }

  /**
   * Validate captured image comprehensively
   */
  validateCapturedImage(
    imageData: string,
    faceQuality: FaceQuality,
    canvas: HTMLCanvasElement
  ): Promise<{ isValid: boolean, score: number, issues: string[] }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) {
          resolve({ isValid: false, score: 0, issues: ['Canvas not supported'] });
          return;
        }

        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const brightness = this.analyzeBrightness(imageData);
        const blurScore = this.detectBlur(tempCanvas);

        const issues: string[] = [];
        let score = faceQuality.score;

        // Brightness check (should be between 0.2 and 0.8)
        if (brightness.mean < 80) {
          issues.push('too_dark');
          score *= 0.8;
        } else if (brightness.mean > 200) {
          issues.push('too_bright');
          score *= 0.8;
        }

        // Contrast check
        if (brightness.contrast < 30) {
          issues.push('low_contrast');
          score *= 0.9;
        }

        // Blur check
        if (blurScore < 0.3) {
          issues.push('blurry');
          score *= 0.7;
        }

        // Face quality check
        if (!faceQuality.isCentered) {
          issues.push('face_not_centered');
          score *= 0.8;
        }

        if (!faceQuality.isValidSize) {
          issues.push('face_wrong_size');
          score *= 0.8;
        }

        const isValid = score >= 0.6 && issues.length === 0;

        resolve({ isValid, score, issues });
      };

      img.src = imageData;
    });
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

