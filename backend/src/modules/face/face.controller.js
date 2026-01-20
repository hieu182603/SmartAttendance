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

export class FaceController {
  /**
   * Register user face with multiple images
   * POST /api/face/register
   */
  static async registerFace(req, res) {
    try {
      const userId = req.user.userId;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: `No images provided. Please upload ${FACE_RECOGNITION_CONFIG.MIN_REGISTRATION_IMAGES}-${FACE_RECOGNITION_CONFIG.MAX_REGISTRATION_IMAGES} face images.`,
        });
      }

      const faceService = new FaceService();
      const result = await faceService.registerUserFace(userId, files);

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

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No images provided",
        });
      }

      const faceService = new FaceService();
      const result = await faceService.updateUserFace(userId, files, mode);

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
}

