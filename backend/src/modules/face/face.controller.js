import {
  FaceService,
  AIServiceUnavailableError,
  FaceNotDetectedError,
  MultipleFacesError,
  PoorImageQualityError,
  FaceVerificationFailedError,
  AIServiceTimeoutError,
  AIServiceError,
} from "./face.service.js";
import { FACE_RECOGNITION_CONFIG } from "../../config/app.config.js";
import { aiServiceClient } from "../../utils/aiServiceClient.js";
import FormData from "form-data";

export class FaceController {
  /**
   * Register user face with multiple images
   * POST /api/face/register
   */
  static async registerFace(req, res) {
    try {
      const userId = req.user.userId;
      const files = req.files;
      const { liveness_success, liveness_passed, liveness_confidence, liveness_challenge } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: `No images provided. Please upload ${FACE_RECOGNITION_CONFIG.MIN_REGISTRATION_IMAGES}-${FACE_RECOGNITION_CONFIG.MAX_REGISTRATION_IMAGES} face images.`,
        });
      }

      // Prepare liveness data if provided
      const livenessData = liveness_success !== undefined || liveness_passed !== undefined ? {
        liveness_success: liveness_success === 'true' || liveness_success === true,
        liveness_passed: liveness_passed === 'true' || liveness_passed === true,
        liveness_confidence: parseFloat(liveness_confidence) || 0,
        liveness_challenge: liveness_challenge || '',
      } : null;

      const faceService = new FaceService();
      const result = await faceService.registerUserFace(userId, files, livenessData);

      return res.status(200).json({
        success: true,
        message: "Face registered successfully",
        data: result,
      });
    } catch (error) {
      console.error("Face registration error:", error);

      // Handle validation errors
      if (error.message.includes("Minimum") || error.message.includes("Maximum")) {
        return res.status(400).json({
          success: false,
          errorCode: "VALIDATION_ERROR",
          message: error.message,
        });
      }

      // Handle specific error types with error codes
      if (error instanceof FaceNotDetectedError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode || "NO_FACE_DETECTED",
          message: error.message,
          details: error.details || null,
        });
      }

      if (error instanceof MultipleFacesError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode || "MULTIPLE_FACES",
          message: error.message,
          details: error.details || null,
        });
      }

      if (error instanceof PoorImageQualityError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode || "POOR_IMAGE_QUALITY",
          message: error.message,
          details: error.details || null,
        });
      }

      if (error instanceof AIServiceUnavailableError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode || "AI_SERVICE_UNAVAILABLE",
          message: "Face recognition service is currently unavailable. Please try again later.",
          details: error.details || null,
        });
      }

      if (error instanceof AIServiceTimeoutError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode || "AI_SERVICE_TIMEOUT",
          message: "Face recognition service request timeout. Please try again.",
          details: error.details || null,
        });
      }

      if (error instanceof AIServiceError) {
        return res.status(error.statusCode || 500).json({
          success: false,
          errorCode: error.errorCode || "AI_SERVICE_ERROR",
          message: error.message,
          details: error.details || null,
        });
      }

      // Generic error fallback
      return res.status(500).json({
        success: false,
        errorCode: "AI_SERVICE_ERROR",
        message: error.message || "Failed to register face",
      });
    }
  }

  /**
   * Get user face registration status
   * GET /api/face/status
   */
  static async getFaceStatus(req, res) {
    try {
      const userId = req.user.userId;
      const faceService = new FaceService();
      const status = await faceService.getFaceStatus(userId);

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error("Get face status error:", error);
      return res.status(500).json({
        success: false,
        errorCode: "AI_SERVICE_ERROR",
        message: error.message || "Failed to get face status",
      });
    }
  }

  /**
   * Update user face data
   * PUT /api/face/register
   */
  static async updateFace(req, res) {
    try {
      const userId = req.user.userId;
      const files = req.files;
      const mode = req.body.mode || "replace"; // replace, append, refresh
      const { liveness_success, liveness_passed, liveness_confidence, liveness_challenge } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No images provided",
        });
      }

      // Prepare liveness data if provided
      const livenessData = liveness_success !== undefined || liveness_passed !== undefined ? {
        liveness_success: liveness_success === 'true' || liveness_success === true,
        liveness_passed: liveness_passed === 'true' || liveness_passed === true,
        liveness_confidence: parseFloat(liveness_confidence) || 0,
        liveness_challenge: liveness_challenge || '',
      } : null;

      const faceService = new FaceService();
      const result = await faceService.updateUserFace(userId, files, mode, livenessData);

      return res.status(200).json({
        success: true,
        message: "Face data updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Face update error:", error);

      // Handle specific error types with error codes
      if (error instanceof FaceNotDetectedError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode || "NO_FACE_DETECTED",
          message: error.message,
          details: error.details || null,
        });
      }

      if (error instanceof MultipleFacesError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode || "MULTIPLE_FACES",
          message: error.message,
          details: error.details || null,
        });
      }

      if (error instanceof PoorImageQualityError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode || "POOR_IMAGE_QUALITY",
          message: error.message,
          details: error.details || null,
        });
      }

      if (error instanceof AIServiceUnavailableError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode || "AI_SERVICE_UNAVAILABLE",
          message: "Face recognition service is currently unavailable. Please try again later.",
          details: error.details || null,
        });
      }

      if (error instanceof AIServiceTimeoutError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode || "AI_SERVICE_TIMEOUT",
          message: "Face recognition service request timeout. Please try again.",
          details: error.details || null,
        });
      }

      if (error instanceof AIServiceError) {
        return res.status(error.statusCode || 500).json({
          success: false,
          errorCode: error.errorCode || "AI_SERVICE_ERROR",
          message: error.message,
          details: error.details || null,
        });
      }

      // Generic error fallback
      return res.status(500).json({
        success: false,
        errorCode: "AI_SERVICE_ERROR",
        message: error.message || "Failed to update face data",
      });
    }
  }

  /**
   * Delete user face data
   * DELETE /api/face/register
   */
  static async deleteFace(req, res) {
    try {
      const userId = req.user.userId;
      const faceService = new FaceService();
      await faceService.deleteUserFace(userId);

      return res.status(200).json({
        success: true,
        message: "Face data deleted successfully",
      });
    } catch (error) {
      console.error("Face deletion error:", error);
      return res.status(500).json({
        success: false,
        errorCode: "AI_SERVICE_ERROR",
        message: error.message || "Failed to delete face data",
      });
    }
  }

  /**
   * Create liveness verification session
   * POST /api/face/liveness/session
   */
  static async createLivenessSession(req, res) {
    try {
      const aiResponse = await aiServiceClient.createLivenessSession();
      return res.status(200).json(aiResponse.data || aiResponse);
    } catch (error) {
      console.error("Create liveness session error:", error);
      return res.status(500).json({
        success: false,
        errorCode: "LIVENESS_ERROR",
        message: "Không thể khởi tạo phiên xác thực khuôn mặt",
      });
    }
  }

  /**
   * Helper to convert data URL string to Buffer
   */
  static dataUrlToBuffer(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") {
      return null;
    }

    const matches = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!matches || matches.length < 3) {
      return null;
    }

    const mimeType = matches[1] || "image/jpeg";
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    return { buffer, mimeType };
  }

  /**
   * Capture baseline pose for liveness challenge
   * POST /api/face/liveness/baseline/:sessionId
   */
  static async captureLivenessBaseline(req, res) {
    const { sessionId } = req.params;

    try {
      let imageBuffer = null;
      let mimeType = "image/jpeg";

      // Prefer uploaded file buffer if available
      if (req.file && req.file.buffer) {
        imageBuffer = req.file.buffer;
        mimeType = req.file.mimetype || mimeType;
      } else if (req.body && req.body.image) {
        const parsed = FaceController.dataUrlToBuffer(req.body.image);
        if (!parsed) {
          return res.status(400).json({
            success: false,
            errorCode: "INVALID_IMAGE",
            message: "Định dạng ảnh không hợp lệ",
          });
        }
        imageBuffer = parsed.buffer;
        mimeType = parsed.mimeType;
      }

      if (!imageBuffer) {
        return res.status(400).json({
          success: false,
          errorCode: "INVALID_IMAGE",
          message: "Không tìm thấy dữ liệu ảnh để xác thực",
        });
      }

      const formData = new FormData();
      formData.append("image", imageBuffer, {
        filename: "liveness-baseline.jpg",
        contentType: mimeType,
      });

      const aiResponse = await aiServiceClient.captureLivenessBaseline(
        sessionId,
        formData
      );

      return res.status(200).json(aiResponse.data || aiResponse);
    } catch (error) {
      console.error("Capture liveness baseline error:", error);
      return res.status(500).json({
        success: false,
        errorCode: "LIVENESS_ERROR",
        message: "Không thể chụp baseline cho xác thực khuôn mặt",
      });
    }
  }

  /**
   * Verify liveness challenge response
   * POST /api/face/liveness/verify/:sessionId
   */
  static async verifyLivenessResponse(req, res) {
    const { sessionId } = req.params;

    try {
      let imageBuffer = null;
      let mimeType = "image/jpeg";

      if (req.file && req.file.buffer) {
        imageBuffer = req.file.buffer;
        mimeType = req.file.mimetype || mimeType;
      } else if (req.body && req.body.image) {
        const parsed = FaceController.dataUrlToBuffer(req.body.image);
        if (!parsed) {
          return res.status(400).json({
            success: false,
            errorCode: "INVALID_IMAGE",
            message: "Định dạng ảnh không hợp lệ",
          });
        }
        imageBuffer = parsed.buffer;
        mimeType = parsed.mimeType;
      }

      if (!imageBuffer) {
        return res.status(400).json({
          success: false,
          errorCode: "INVALID_IMAGE",
          message: "Không tìm thấy dữ liệu ảnh để xác thực",
        });
      }

      const formData = new FormData();
      formData.append("image", imageBuffer, {
        filename: "liveness-verify.jpg",
        contentType: mimeType,
      });

      const aiResponse = await aiServiceClient.verifyLivenessResponse(
        sessionId,
        formData
      );

      return res.status(200).json(aiResponse.data || aiResponse);
    } catch (error) {
      console.error("Verify liveness response error:", error);
      return res.status(500).json({
        success: false,
        errorCode: "LIVENESS_ERROR",
        message: "Không thể xác thực liveness",
      });
    }
  }

  // ==========================================================================
  // UNIFIED FACE SCAN (POST /api/face/scan)
  // ==========================================================================

  /**
   * Unified face scan — auto-detects registration vs verification + attendance
   * POST /api/face/scan
   *
   * Body (multipart/form-data):
   *   images[]          - 1–5 face images
   *   livenessPassed    - "true" (required)
   *   deviceId          - optional device identifier
   *   timestamp         - optional ISO string
   */
  static async scanFace(req, res) {
    try {
      const userId = req.user.userId;
      const files = req.files;
      const { livenessPassed, deviceId } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          errorCode: "VALIDATION_ERROR",
          message: "No images provided. Please capture face images and try again.",
        });
      }

      const livenessData = {
        livenessPassed: livenessPassed === "true" || livenessPassed === true,
      };

      const faceService = new FaceService();
      const result = await faceService.faceScan(userId, files, livenessData, deviceId || null);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Face scan error:", error);

      // Handle specific error types
      if (error instanceof FaceVerificationFailedError) {
        return res.status(403).json({
          success: false,
          status: "failed",
          errorCode: error.errorCode || "FACE_VERIFICATION_FAILED",
          message: error.message,
          confidence: error.similarity,
          threshold: error.threshold,
        });
      }

      if (error instanceof FaceNotDetectedError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode,
          message: error.message,
          details: error.details || null,
        });
      }

      if (error instanceof MultipleFacesError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode,
          message: error.message,
          details: error.details || null,
        });
      }

      if (error instanceof PoorImageQualityError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode,
          message: error.message,
          details: error.details || null,
        });
      }

      if (error instanceof AIServiceUnavailableError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode,
          message: "Face recognition service is currently unavailable. Please try again later.",
        });
      }

      if (error instanceof AIServiceTimeoutError) {
        return res.status(error.statusCode).json({
          success: false,
          errorCode: error.errorCode,
          message: "Face recognition service request timeout. Please try again.",
        });
      }

      if (error instanceof AIServiceError) {
        return res.status(error.statusCode || 500).json({
          success: false,
          errorCode: error.errorCode,
          message: error.message,
          details: error.details || null,
        });
      }

      return res.status(500).json({
        success: false,
        errorCode: "INTERNAL_ERROR",
        message: error.message || "Failed to process face scan",
      });
    }
  }
}

