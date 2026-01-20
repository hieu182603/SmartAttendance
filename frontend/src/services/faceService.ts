import api from "./api";
import type { AxiosError } from "axios";

/**
 * Face Registration Error Types
 */
export type FaceRegistrationErrorType =
  | "VALIDATION_ERROR"
  | "NO_FACE_DETECTED"
  | "MULTIPLE_FACES"
  | "POOR_IMAGE_QUALITY"
  | "AI_SERVICE_ERROR"
  | "AI_SERVICE_UNAVAILABLE"
  | "AI_SERVICE_TIMEOUT"
  | "FACE_VERIFICATION_FAILED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Face Registration Error Interface
 */
export interface FaceRegistrationError {
  type: FaceRegistrationErrorType;
  code: string;
  message: string;
  userMessage: string;
  details?: {
    totalImages?: number;
    validFaces?: number;
    errors?: Array<{
      imageIndex?: number;
      errorCode?: string;
      errorMessage?: string;
    }>;
    similarity?: number;
    threshold?: number;
    [key: string]: unknown;
  };
  originalError?: unknown;
}

/**
 * API Error Response Structure
 */
interface ApiErrorResponse {
  success: false;
  errorCode?: string;
  message?: string;
  details?: unknown;
}

/**
 * Retry Configuration
 */
interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  retryableStatusCodes: number[];
  retryableErrorCodes: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrorCodes: ["AI_SERVICE_ERROR", "AI_SERVICE_TIMEOUT", "AI_SERVICE_UNAVAILABLE"],
};

/**
 * Error Code to User-Friendly Message Mapping (Vietnamese)
 */
const ERROR_MESSAGES: Record<FaceRegistrationErrorType, string> = {
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại số lượng ảnh (tối thiểu 5, tối đa 10).",
  NO_FACE_DETECTED: "Không phát hiện khuôn mặt trong ảnh. Vui lòng đảm bảo ảnh rõ ràng và có khuôn mặt.",
  MULTIPLE_FACES: "Phát hiện nhiều khuôn mặt trong ảnh. Vui lòng chỉ chụp một người trong mỗi ảnh.",
  POOR_IMAGE_QUALITY: "Chất lượng ảnh quá kém. Vui lòng chụp lại ảnh với ánh sáng tốt và độ nét cao hơn.",
  AI_SERVICE_ERROR: "Lỗi hệ thống nhận diện khuôn mặt. Vui lòng thử lại sau.",
  AI_SERVICE_UNAVAILABLE: "Dịch vụ nhận diện khuôn mặt hiện không khả dụng. Vui lòng thử lại sau.",
  AI_SERVICE_TIMEOUT: "Yêu cầu quá thời gian chờ. Vui lòng thử lại.",
  FACE_VERIFICATION_FAILED: "Xác thực khuôn mặt thất bại. Vui lòng thử lại.",
  NETWORK_ERROR: "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.",
  UNKNOWN_ERROR: "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.",
};

export interface FaceStatus {
  isRegistered: boolean;
  registeredAt: string | null;
  lastVerifiedAt: string | null;
  embeddingCount: number;
}

export interface FaceRegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    embeddings: number[][];
    faceImages: string[];
    errors?: string[];
  };
}

/**
 * Check if error is a network error that can be retried
 */
function isRetryableError(error: AxiosError, config: RetryConfig): boolean {
  // Check status code
  if (error.response?.status && config.retryableStatusCodes.includes(error.response.status)) {
    return true;
  }

  // Check network errors (no response)
  if (!error.response && (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK")) {
    return true;
  }

  // Check error code from response
  const errorData = error.response?.data as ApiErrorResponse | undefined;
  if (errorData?.errorCode && config.retryableErrorCodes.includes(errorData.errorCode)) {
    return true;
  }

  return false;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute request with retry logic
 */
async function executeWithRetry<T>(
  requestFn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: AxiosError | Error | unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (error instanceof Error && "isAxiosError" in error) {
        const axiosError = error as AxiosError;
        if (!isRetryableError(axiosError, config)) {
          throw error;
        }
      } else {
        // Non-Axios errors are not retryable
        throw error;
      }

      // Wait before retry (exponential backoff)
      const delay = config.retryDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Parse error from API response
 */
export function parseFaceRegistrationError(error: unknown): FaceRegistrationError {
  // Handle Axios errors
  if (error && typeof error === "object" && "isAxiosError" in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    // Network errors (no response)
    if (!axiosError.response) {
      return {
        type: "NETWORK_ERROR",
        code: axiosError.code || "NETWORK_ERROR",
        message: axiosError.message || "Network error",
        userMessage: ERROR_MESSAGES.NETWORK_ERROR,
        originalError: error,
      };
    }

    // API error response
    const errorData = axiosError.response.data;
    const errorCode = errorData?.errorCode || "UNKNOWN_ERROR";
    const errorType = mapErrorCodeToType(errorCode);

    return {
      type: errorType,
      code: errorCode,
      message: errorData?.message || axiosError.message || "Unknown error",
      userMessage: ERROR_MESSAGES[errorType],
      details: parseErrorDetails(errorData?.details),
      originalError: error,
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      type: "UNKNOWN_ERROR",
      code: "UNKNOWN_ERROR",
      message: error.message,
      userMessage: ERROR_MESSAGES.UNKNOWN_ERROR,
      originalError: error,
    };
  }

  // Fallback
  return {
    type: "UNKNOWN_ERROR",
    code: "UNKNOWN_ERROR",
    message: "Unknown error occurred",
    userMessage: ERROR_MESSAGES.UNKNOWN_ERROR,
    originalError: error,
  };
}

/**
 * Map backend error code to frontend error type
 */
function mapErrorCodeToType(errorCode: string): FaceRegistrationErrorType {
  const codeMap: Record<string, FaceRegistrationErrorType> = {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    NO_FACE_DETECTED: "NO_FACE_DETECTED",
    MULTIPLE_FACES: "MULTIPLE_FACES",
    POOR_IMAGE_QUALITY: "POOR_IMAGE_QUALITY",
    AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
    AI_SERVICE_UNAVAILABLE: "AI_SERVICE_UNAVAILABLE",
    AI_SERVICE_TIMEOUT: "AI_SERVICE_TIMEOUT",
    FACE_VERIFICATION_FAILED: "FACE_VERIFICATION_FAILED",
  };

  return codeMap[errorCode] || "UNKNOWN_ERROR";
}

/**
 * Parse error details from API response
 */
function parseErrorDetails(details: unknown): FaceRegistrationError["details"] {
  if (!details || typeof details !== "object") {
    return undefined;
  }

  const detailsObj = details as Record<string, unknown>;

  return {
    totalImages: typeof detailsObj.totalImages === "number" ? detailsObj.totalImages : undefined,
    validFaces: typeof detailsObj.validFaces === "number" ? detailsObj.validFaces : undefined,
    errors: Array.isArray(detailsObj.errors) ? detailsObj.errors : undefined,
    similarity: typeof detailsObj.similarity === "number" ? detailsObj.similarity : undefined,
    threshold: typeof detailsObj.threshold === "number" ? detailsObj.threshold : undefined,
    ...detailsObj,
  };
}

/**
 * Format error message for display
 */
export function formatFaceError(error: FaceRegistrationError): string {
  let message = error.userMessage;

  // Add details if available
  if (error.details) {
    const parts: string[] = [];

    if (error.details.totalImages !== undefined && error.details.validFaces !== undefined) {
      parts.push(
        `Đã xử lý ${error.details.validFaces}/${error.details.totalImages} ảnh thành công.`
      );
    }

    if (error.details.similarity !== undefined && error.details.threshold !== undefined) {
      parts.push(
        `Độ tương đồng: ${(error.details.similarity * 100).toFixed(1)}% (Ngưỡng: ${(error.details.threshold * 100).toFixed(1)}%)`
      );
    }

    if (parts.length > 0) {
      message = `${message}\n${parts.join("\n")}`;
    }
  }

  return message;
}

/**
 * Check if error is retryable
 */
export function isRetryableFaceError(error: FaceRegistrationError): boolean {
  const retryableTypes: FaceRegistrationErrorType[] = [
    "NETWORK_ERROR",
    "AI_SERVICE_ERROR",
    "AI_SERVICE_UNAVAILABLE",
    "AI_SERVICE_TIMEOUT",
  ];

  return retryableTypes.includes(error.type);
}

export const faceService = {
  /**
   * Get user face registration status
   */
  getFaceStatus: async (): Promise<FaceStatus> => {
    const response = await api.get("/face/status");
    return response.data.data;
  },

  /**
   * Register user face with multiple images
   * @param images Array of File objects (5-7 images recommended)
   * @param metadata Optional metadata array with quality scores and detection confidence
   * @param retryConfig Optional retry configuration
   */
  registerFace: async (
    images: File[],
    metadata?: Array<{
      qualityScore: number;
      detectionConfidence: number;
      timestamp: number;
    }>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<FaceRegistrationResponse> => {
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    return executeWithRetry(async () => {
      const formData = new FormData();
      images.forEach((image, index) => {
        formData.append("images", image);
        
        // Append metadata if provided
        if (metadata && metadata[index]) {
          const meta = metadata[index];
          formData.append(`metadata[${index}][qualityScore]`, meta.qualityScore.toString());
          formData.append(`metadata[${index}][detectionConfidence]`, meta.detectionConfidence.toString());
          formData.append(`metadata[${index}][timestamp]`, meta.timestamp.toString());
        }
      });

      const response = await api.post("/face/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    }, config);
  },

  /**
   * Update user face data
   * @param images New images to add/replace
   * @param mode 'replace' | 'append'
   * @param metadata Optional metadata array with quality scores and detection confidence
   * @param retryConfig Optional retry configuration
   */
  updateFace: async (
    images: File[],
    mode: "replace" | "append" = "replace",
    metadata?: Array<{
      qualityScore: number;
      detectionConfidence: number;
      timestamp: number;
    }>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<FaceRegistrationResponse> => {
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    return executeWithRetry(async () => {
      const formData = new FormData();
      images.forEach((image, index) => {
        formData.append("images", image);
        
        // Append metadata if provided
        if (metadata && metadata[index]) {
          const meta = metadata[index];
          formData.append(`metadata[${index}][qualityScore]`, meta.qualityScore.toString());
          formData.append(`metadata[${index}][detectionConfidence]`, meta.detectionConfidence.toString());
          formData.append(`metadata[${index}][timestamp]`, meta.timestamp.toString());
        }
      });
      formData.append("mode", mode);

      const response = await api.put("/face/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    }, config);
  },

  /**
   * Delete user face data
   */
  deleteFace: async (): Promise<void> => {
    await api.delete("/face/register");
  },
};





