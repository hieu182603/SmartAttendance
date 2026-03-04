import { UserModel } from "../users/user.model.js";
import { uploadFaceImage, deleteFaceImages } from "../../utils/cloudinary.js";
import { aiServiceClient } from "../../utils/aiServiceClient.js";
import { FACE_RECOGNITION_CONFIG } from "../../config/app.config.js";
import { logActivityWithoutRequest } from "../../utils/logger.util.js";
import FormData from "form-data";
import axios from "axios";

/**
 * Custom error classes for face recognition
 */
export class AIServiceUnavailableError extends Error {
  constructor(message = "AI Service is currently unavailable") {
    super(message);
    this.name = "AIServiceUnavailableError";
    this.statusCode = 503;
    this.errorCode = "AI_SERVICE_UNAVAILABLE";
  }
}

export class FaceNotDetectedError extends Error {
  constructor(message = "No face detected in image", details = null) {
    super(message);
    this.name = "FaceNotDetectedError";
    this.statusCode = 400;
    this.errorCode = "NO_FACE_DETECTED";
    this.details = details;
  }
}

export class MultipleFacesError extends Error {
  constructor(message = "Multiple faces detected in image", details = null) {
    super(message);
    this.name = "MultipleFacesError";
    this.statusCode = 400;
    this.errorCode = "MULTIPLE_FACES";
    this.details = details;
  }
}

export class PoorImageQualityError extends Error {
  constructor(message = "Image quality is too poor", details = null) {
    super(message);
    this.name = "PoorImageQualityError";
    this.statusCode = 400;
    this.errorCode = "POOR_IMAGE_QUALITY";
    this.details = details;
  }
}

export class FaceVerificationFailedError extends Error {
  constructor(message = "Face verification failed", similarity = null, threshold = null) {
    super(message);
    this.name = "FaceVerificationFailedError";
    this.statusCode = 403;
    this.errorCode = "FACE_VERIFICATION_FAILED";
    this.similarity = similarity;
    this.threshold = threshold;
  }
}

export class AIServiceTimeoutError extends Error {
  constructor(message = "AI Service request timeout") {
    super(message);
    this.name = "AIServiceTimeoutError";
    this.statusCode = 504;
    this.errorCode = "AI_SERVICE_TIMEOUT";
  }
}

export class AIServiceError extends Error {
  constructor(message = "AI Service error", errorCode = "AI_SERVICE_ERROR", details = null) {
    super(message);
    this.name = "AIServiceError";
    this.statusCode = 500;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export class SpoofDetectedError extends Error {
  constructor(message = "Spoofing attack detected", antiSpoofingData = null) {
    super(message);
    this.name = "SpoofDetectedError";
    this.statusCode = 403;
    this.errorCode = "SPOOF_DETECTED";
    this.antiSpoofingData = antiSpoofingData;
  }
}

/**
 * Face Service - Handles face registration and verification
 */
export class FaceService {
  /**
   * Register user face with multiple images
   * @param {string} userId - User ID
   * @param {Array<Express.Multer.File>} imageFiles - Array of image files
   * @param {Object} livenessData - Optional liveness verification data
   * @param {boolean} livenessData.liveness_success - Whether liveness check succeeded
   * @param {boolean} livenessData.liveness_passed - Whether liveness check passed
   * @param {number} livenessData.liveness_confidence - Liveness check confidence score
   * @param {string} livenessData.liveness_challenge - Liveness challenge type
   * @returns {Promise<{success: boolean, embeddings: Array, faceImages: Array, errors?: Array}>}
   */
  async registerUserFace(userId, imageFiles, livenessData = null) {
    // Declare variables outside try block for cleanup in catch
    let uploadedPublicIds = [];

    try {
      // Validate image count (from centralized config)
      const MIN_IMAGES = FACE_RECOGNITION_CONFIG.MIN_REGISTRATION_IMAGES;
      const MAX_IMAGES = FACE_RECOGNITION_CONFIG.MAX_REGISTRATION_IMAGES;

      if (!imageFiles || imageFiles.length < MIN_IMAGES) {
        throw new Error(
          `Minimum ${MIN_IMAGES} images required for registration. Provided: ${imageFiles?.length || 0}`
        );
      }

      if (imageFiles.length > MAX_IMAGES) {
        throw new Error(
          `Maximum ${MAX_IMAGES} images allowed. Provided: ${imageFiles.length}`
        );
      }

      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Upload images to Cloudinary and track publicIds for cleanup
      const uploadedImages = [];
      uploadedPublicIds = []; // Reset array
      const uploadErrors = [];

      for (let i = 0; i < imageFiles.length; i++) {
        try {
          const result = await uploadFaceImage(imageFiles[i].buffer);
          uploadedImages.push(result.url);
          uploadedPublicIds.push(result.publicId);
        } catch (error) {
          uploadErrors.push(`Image ${i + 1}: ${error.message}`);
        }
      }

      if (uploadedImages.length === 0) {
        throw new Error(`Failed to upload images. Errors: ${uploadErrors.join("; ")}`);
      }

      // Prepare form data for AI service
      const formData = new FormData();
      for (const file of imageFiles) {
        formData.append("images", file.buffer, {
          filename: file.originalname || "face.jpg",
          contentType: file.mimetype || "image/jpeg",
        });
      }

      // Append liveness verification data if provided
      if (livenessData) {
        if (livenessData.liveness_success !== undefined) {
          formData.append("liveness_success", livenessData.liveness_success.toString());
        }
        if (livenessData.liveness_passed !== undefined) {
          formData.append("liveness_passed", livenessData.liveness_passed.toString());
        }
        if (livenessData.liveness_confidence !== undefined) {
          formData.append("liveness_confidence", livenessData.liveness_confidence.toString());
        }
        if (livenessData.liveness_challenge !== undefined) {
          formData.append("liveness_challenge", livenessData.liveness_challenge);
        }
      }

      // Call AI service
      let aiResponse;
      try {
        aiResponse = await aiServiceClient.registerFaces(formData);
      } catch (error) {
        // Handle AxiosError with 4xx responses
        if (axios.isAxiosError(error)) {
          // Check if it's a 4xx response from AI service
          if (error.response && error.response.status >= 400 && error.response.status < 500) {
            const errorData = error.response.data || {};
            const errorCode = errorData.error_code || "AI_SERVICE_ERROR";
            const errorMessage = errorData.error || errorData.detail || "Face registration failed";
            const errorDetails = errorData.error_details || null;

            // Map error codes to specific error classes
            switch (errorCode) {
              case "NO_FACE_DETECTED":
                throw new FaceNotDetectedError(errorMessage, errorDetails);
              case "MULTIPLE_FACES":
                throw new MultipleFacesError(errorMessage, errorDetails);
              case "POOR_IMAGE_QUALITY":
                throw new PoorImageQualityError(errorMessage, errorDetails);
              case "AI_SERVICE_ERROR":
              default:
                throw new AIServiceError(errorMessage, errorCode, errorDetails);
            }
          }

          // Handle timeout errors
          if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
            throw new AIServiceTimeoutError();
          }

          // Handle connection errors
          if (error.code === "ECONNREFUSED" || error.message.includes("circuit breaker") || error.message.includes("unavailable")) {
            throw new AIServiceUnavailableError();
          }
        }

        // Re-throw if not handled
        throw error;
      }

      // Check if response indicates failure (4xx status or success: false)
      if (aiResponse.status >= 400 || !aiResponse.data.success) {
        // Clean up uploaded images before throwing error
        if (uploadedPublicIds.length > 0) {
          try {
            await deleteFaceImages(uploadedPublicIds);
          } catch (cleanupError) {
            console.error("Failed to cleanup uploaded images after AI validation failure:", cleanupError);
          }
        }

        // Categorize error from AI service
        const errorCode = aiResponse.data.error_code || "AI_SERVICE_ERROR";
        const errorMessage = aiResponse.data.error || (typeof aiResponse.data.detail === 'string' ? aiResponse.data.detail : JSON.stringify(aiResponse.data.detail)) || "Face registration failed";
        const errorDetails = aiResponse.data.error_details || null;

        // Map error codes to specific error classes
        switch (errorCode) {
          case "NO_FACE_DETECTED":
            throw new FaceNotDetectedError(errorMessage, errorDetails);
          case "MULTIPLE_FACES":
            throw new MultipleFacesError(errorMessage, errorDetails);
          case "POOR_IMAGE_QUALITY":
            throw new PoorImageQualityError(errorMessage, errorDetails);
          case "AI_SERVICE_ERROR":
          default:
            throw new AIServiceError(errorMessage, errorCode, errorDetails);
        }
      }

      // Extract embeddings from response
      const embeddings = aiResponse.data.faces.map((face) => face.embedding);

      // Validate minimum valid faces count (Comment 3)
      const validFacesCount = embeddings.length;
      if (validFacesCount < MIN_IMAGES) {
        // Clean up uploaded images before throwing error
        if (uploadedPublicIds.length > 0) {
          try {
            await deleteFaceImages(uploadedPublicIds);
          } catch (cleanupError) {
            console.error("Failed to cleanup uploaded images after validation failure:", cleanupError);
          }
        }

        throw new AIServiceError(
          `Registration failed: Only ${validFacesCount} valid face(s) detected, but minimum ${MIN_IMAGES} required.`,
          "VALIDATION_ERROR",
          {
            total_images: imageFiles.length,
            valid_faces: validFacesCount,
            required_minimum: MIN_IMAGES,
          }
        );
      }

      // Store old publicIds for cleanup if replacing existing registration
      const oldPublicIds = user.faceData?.faceImagePublicIds || [];

      // Update user's face data
      user.faceData = {
        isRegistered: true,
        embeddings: embeddings,
        registeredAt: new Date(),
        faceImages: uploadedImages,
        faceImagePublicIds: uploadedPublicIds,
        lastVerifiedAt: null,
      };

      // Save user data
      await user.save();

      // Clean up old images after successful save
      if (oldPublicIds.length > 0) {
        try {
          await deleteFaceImages(oldPublicIds);
        } catch (cleanupError) {
          console.error("Failed to cleanup old face images:", cleanupError);
          // Don't throw - registration was successful
        }
      }

      // Log activity
      await logActivityWithoutRequest({
        userId,
        action: "register_face",
        entityType: "user",
        entityId: userId,
        details: {
          description: "User registered face biometric data",
          imageCount: uploadedImages.length,
          validFaces: embeddings.length,
          timestamp: new Date(),
        },
        status: "success",
      });

      return {
        success: true,
        embeddings: embeddings,
        faceImages: uploadedImages,
        errors: uploadErrors.length > 0 ? uploadErrors : undefined,
      };
    } catch (error) {
      // Clean up uploaded images if registration failed
      if (uploadedPublicIds && uploadedPublicIds.length > 0) {
        try {
          await deleteFaceImages(uploadedPublicIds);
        } catch (cleanupError) {
          console.error("Failed to cleanup uploaded images after registration failure:", cleanupError);
        }
      }

      // Log error
      await logActivityWithoutRequest({
        userId,
        action: "register_face",
        entityType: "user",
        entityId: userId,
        details: {
          description: "Face registration failed",
          error: error.message,
        },
        status: "failed",
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Verify user face against registered embeddings
   * @param {string} userId - User ID
   * @param {Buffer} candidateImageBuffer - Candidate image buffer
   * @returns {Promise<{match: boolean, similarity: number, threshold: number}>}
   */
  async verifyUserFace(userId, candidateImageBuffer) {
    try {
      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (!user.hasFaceRegistered()) {
        throw new Error("User has not registered face");
      }

      // Prepare form data for AI service
      const formData = new FormData();
      formData.append("image", candidateImageBuffer, {
        filename: "verify.jpg",
        contentType: "image/jpeg",
      });
      formData.append(
        "reference_embeddings_json",
        JSON.stringify(user.faceData.embeddings)
      );
      formData.append(
        "threshold",
        FACE_RECOGNITION_CONFIG.VERIFICATION_THRESHOLD.toString()
      );

      // Call AI service
      let aiResponse;
      try {
        aiResponse = await aiServiceClient.verifyFace(formData);
      } catch (error) {
        // Handle AxiosError with 4xx responses
        if (axios.isAxiosError(error)) {
          // Check if it's a 4xx response from AI service
          if (error.response && error.response.status >= 400 && error.response.status < 500) {
            const errorData = error.response.data || {};
            const errorCode = errorData.error_code || "AI_SERVICE_ERROR";
            const errorMessage = errorData.error || errorData.detail || "Face verification failed";
            const errorDetails = errorData.error_details || null;

            // Map error codes to specific error classes
            switch (errorCode) {
              case "NO_FACE_DETECTED":
                throw new FaceNotDetectedError(errorMessage, errorDetails);
              case "MULTIPLE_FACES":
                throw new MultipleFacesError(errorMessage, errorDetails);
              case "POOR_IMAGE_QUALITY":
                throw new PoorImageQualityError(errorMessage, errorDetails);
              case "SPOOF_DETECTED":
                throw new SpoofDetectedError(errorMessage, errorDetails);
              case "AI_SERVICE_ERROR":
              default:
                throw new AIServiceError(errorMessage, errorCode, errorDetails);
            }
          }

          // Handle timeout errors
          if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
            throw new AIServiceTimeoutError();
          }

          // Handle connection errors
          if (error.code === "ECONNREFUSED" || error.message.includes("circuit breaker") || error.message.includes("unavailable")) {
            throw new AIServiceUnavailableError();
          }
        }

        // Re-throw if not handled
        throw error;
      }

      // Check if response indicates failure (4xx status or error field)
      if (aiResponse.status >= 400 || aiResponse.data.error) {
        // Categorize error from AI service
        const errorCode = aiResponse.data.error_code || "AI_SERVICE_ERROR";
        const errorMessage = aiResponse.data.error || aiResponse.data.detail || "Face verification failed";
        const errorDetails = aiResponse.data.error_details || null;

        // Map error codes to specific error classes
        switch (errorCode) {
          case "NO_FACE_DETECTED":
            throw new FaceNotDetectedError(errorMessage, errorDetails);
          case "MULTIPLE_FACES":
            throw new MultipleFacesError(errorMessage, errorDetails);
          case "POOR_IMAGE_QUALITY":
            throw new PoorImageQualityError(errorMessage, errorDetails);
          case "SPOOF_DETECTED":
            throw new SpoofDetectedError(errorMessage, errorDetails);
          case "AI_SERVICE_ERROR":
          default:
            throw new AIServiceError(errorMessage, errorCode, errorDetails);
        }
      }

      const result = {
        match: aiResponse.data.match,
        similarity: aiResponse.data.similarity,
        threshold: aiResponse.data.threshold || FACE_RECOGNITION_CONFIG.VERIFICATION_THRESHOLD,
      };

      // Update lastVerifiedAt if match
      if (result.match) {
        user.faceData.lastVerifiedAt = new Date();
        await user.save();
      }

      return result;
    } catch (error) {
      // Re-throw custom errors as-is
      if (
        error instanceof AIServiceUnavailableError ||
        error instanceof FaceNotDetectedError ||
        error instanceof MultipleFacesError ||
        error instanceof PoorImageQualityError ||
        error instanceof FaceVerificationFailedError ||
        error instanceof AIServiceTimeoutError ||
        error instanceof AIServiceError ||
        error instanceof SpoofDetectedError
      ) {
        throw error;
      }

      // Wrap other errors
      throw new Error(`Face verification failed: ${error.message}`);
    }
  }

  /**
   * Update user face data
   * @param {string} userId - User ID
   * @param {Array<Express.Multer.File>} newImageFiles - New image files
   * @param {string} mode - 'replace' | 'append' | 'refresh'
   * @param {Object} livenessData - Optional liveness verification data
   * @param {boolean} livenessData.liveness_success - Whether liveness check succeeded
   * @param {boolean} livenessData.liveness_passed - Whether liveness check passed
   * @param {number} livenessData.liveness_confidence - Liveness check confidence score
   * @param {string} livenessData.liveness_challenge - Liveness challenge type
   * @returns {Promise<{success: boolean, embeddings: Array, faceImages: Array}>}
   */
  async updateUserFace(userId, newImageFiles, mode = "replace", livenessData = null) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (mode === "replace") {
        // Delete old embeddings and register new ones
        return await this.registerUserFace(userId, newImageFiles, livenessData);
      } else if (mode === "append") {
        // Add new embeddings to existing set
        const MAX_EMBEDDINGS = 15;
        const MIN_IMAGES = 1;

        if (!newImageFiles || newImageFiles.length < MIN_IMAGES) {
          throw new Error(`At least ${MIN_IMAGES} image required for update`);
        }

        // Upload new images and track publicIds
        const uploadedImages = [];
        const uploadedPublicIds = [];
        try {
          for (const file of newImageFiles) {
            const result = await uploadFaceImage(file.buffer);
            uploadedImages.push(result.url);
            uploadedPublicIds.push(result.publicId);
          }
        } catch (uploadError) {
          // If upload fails, clean up any images that were already uploaded
          if (uploadedPublicIds.length > 0) {
            try {
              await deleteFaceImages(uploadedPublicIds);
            } catch (cleanupError) {
              console.error("Failed to cleanup uploaded images after upload failure:", cleanupError);
            }
          }
          throw uploadError;
        }

        // Get new embeddings
        const formData = new FormData();
        for (const file of newImageFiles) {
          formData.append("images", file.buffer, {
            filename: file.originalname || "face.jpg",
            contentType: file.mimetype || "image/jpeg",
          });
        }

        // Append liveness verification data if provided
        if (livenessData) {
          if (livenessData.liveness_success !== undefined) {
            formData.append("liveness_success", livenessData.liveness_success.toString());
          }
          if (livenessData.liveness_passed !== undefined) {
            formData.append("liveness_passed", livenessData.liveness_passed.toString());
          }
          if (livenessData.liveness_confidence !== undefined) {
            formData.append("liveness_confidence", livenessData.liveness_confidence.toString());
          }
          if (livenessData.liveness_challenge !== undefined) {
            formData.append("liveness_challenge", livenessData.liveness_challenge);
          }
        }

        try {
          const aiResponse = await aiServiceClient.registerFaces(formData);
          if (!aiResponse.data.success) {
            // Clean up uploaded images before throwing error
            if (uploadedPublicIds.length > 0) {
              try {
                await deleteFaceImages(uploadedPublicIds);
              } catch (cleanupError) {
                console.error("Failed to cleanup uploaded images after AI validation failure:", cleanupError);
              }
            }

            // Categorize error from AI service
            const errorCode = aiResponse.data.error_code || "AI_SERVICE_ERROR";
            const errorMessage = aiResponse.data.error || "Face update failed";
            const errorDetails = aiResponse.data.error_details || null;

            // Map error codes to specific error classes
            switch (errorCode) {
              case "NO_FACE_DETECTED":
                throw new FaceNotDetectedError(errorMessage, errorDetails);
              case "MULTIPLE_FACES":
                throw new MultipleFacesError(errorMessage, errorDetails);
              case "POOR_IMAGE_QUALITY":
                throw new PoorImageQualityError(errorMessage, errorDetails);
              case "AI_SERVICE_ERROR":
              default:
                throw new AIServiceError(errorMessage, errorCode, errorDetails);
            }
          }

          const newEmbeddings = aiResponse.data.faces.map((face) => face.embedding);
          const totalEmbeddings = [...(user.faceData.embeddings || []), ...newEmbeddings];

          // Limit to MAX_EMBEDDINGS (keep most recent)
          user.faceData.embeddings = totalEmbeddings.slice(-MAX_EMBEDDINGS);
          user.faceData.faceImages = [...(user.faceData.faceImages || []), ...uploadedImages].slice(-MAX_EMBEDDINGS);
          user.faceData.faceImagePublicIds = [...(user.faceData.faceImagePublicIds || []), ...uploadedPublicIds].slice(-MAX_EMBEDDINGS);
          user.faceData.registeredAt = new Date();
          user.faceData.isRegistered = true;

          await user.save();

          return {
            success: true,
            embeddings: user.faceData.embeddings,
            faceImages: user.faceData.faceImages,
          };
        } catch (aiError) {
          // Clean up uploaded images if AI service call fails
          if (uploadedPublicIds.length > 0) {
            try {
              await deleteFaceImages(uploadedPublicIds);
            } catch (cleanupError) {
              console.error("Failed to cleanup uploaded images after AI service failure:", cleanupError);
            }
          }
          throw aiError;
        }
      } else {
        throw new Error(`Invalid update mode: ${mode}`);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete user face data
   * @param {string} userId - User ID
   */
  async deleteUserFace(userId) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Delete images from Cloudinary before clearing data
      const publicIds = user.faceData?.faceImagePublicIds || [];
      if (publicIds.length > 0) {
        try {
          await deleteFaceImages(publicIds);
        } catch (cleanupError) {
          console.error("Failed to delete face images from Cloudinary:", cleanupError);
          // Continue with deletion even if Cloudinary cleanup fails
        }
      }

      // Clear the face data
      user.faceData = {
        isRegistered: false,
        embeddings: [],
        registeredAt: null,
        faceImages: [],
        faceImagePublicIds: [],
        lastVerifiedAt: null,
      };

      await user.save();

      await logActivityWithoutRequest({
        userId,
        action: "delete_face",
        entityType: "user",
        entityId: userId,
        details: {
          description: "User deleted face biometric data",
        },
        status: "success",
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user face registration status
   * @param {string} userId - User ID
   * @returns {Promise<{isRegistered: boolean, registeredAt: Date|null, lastVerifiedAt: Date|null}>}
   */
  async getFaceStatus(userId) {
    const user = await UserModel.findById(userId).select("faceData");
    if (!user) {
      throw new Error("User not found");
    }

    return {
      isRegistered: user.faceData?.isRegistered || false,
      registeredAt: user.faceData?.registeredAt || null,
      lastVerifiedAt: user.faceData?.lastVerifiedAt || null,
      embeddingCount: user.faceData?.embeddings?.length || 0,
    };
  }

  // ==========================================================================
  // UNIFIED FACE SCAN (Register OR Verify + Attendance)
  // ==========================================================================

  /**
   * Compute element-wise mean of multiple embedding vectors
   * @param {Array<Array<number>>} embeddings - Array of embedding vectors (each 512-dim)
   * @returns {Array<number>} Mean embedding vector
   */
  static computeMeanEmbedding(embeddings) {
    if (!embeddings || embeddings.length === 0) return [];
    if (embeddings.length === 1) return [...embeddings[0]];

    const dim = embeddings[0].length;
    const mean = new Array(dim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        mean[i] += emb[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      mean[i] /= embeddings.length;
    }

    return mean;
  }

  /**
   * Unified face scan — auto-detects registration vs verification flow
   *
   * @param {string} userId
   * @param {Array<Express.Multer.File>} imageFiles - 1–5 images
   * @param {Object} livenessData - { livenessPassed: boolean }
   * @param {string|null} deviceId - Optional device identifier
   * @returns {Promise<Object>} Unified response
   *
   * Concurrency notes:
   * - AttendanceModel has a unique compound index { userId, date } which prevents
   *   duplicate records even under concurrent requests.
   * - Mongoose save() uses optimistic locking — concurrent saves will throw a
   *   duplicate key error caught and handled gracefully.
   */
  async faceScan(userId, imageFiles, livenessData = null, deviceId = null) {
    // ── Step 1: Validate inputs ─────────────────────────────────────────
    if (!livenessData || livenessData.livenessPassed !== true) {
      throw new AIServiceError(
        "Liveness verification is required. Please complete the liveness check before scanning.",
        "LIVENESS_REQUIRED"
      );
    }

    if (!imageFiles || imageFiles.length === 0) {
      throw new AIServiceError(
        "At least 1 image is required for face scan.",
        "VALIDATION_ERROR"
      );
    }

    // ── Step 2: Lookup user ─────────────────────────────────────────────
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const hasExistingFace = user.hasFaceRegistered();

    // ── Step 3A: REGISTRATION FLOW ──────────────────────────────────────
    if (!hasExistingFace) {
      return await this._scanRegister(user, imageFiles, livenessData);
    }

    // ── Step 3B: VERIFICATION FLOW ──────────────────────────────────────
    return await this._scanVerify(user, imageFiles, deviceId);
  }

  /**
   * Registration sub-flow for faceScan
   * @private
   */
  async _scanRegister(user, imageFiles, livenessData) {
    const MIN_IMAGES = FACE_RECOGNITION_CONFIG.MIN_REGISTRATION_IMAGES;
    const MAX_IMAGES = FACE_RECOGNITION_CONFIG.MAX_REGISTRATION_IMAGES;

    if (imageFiles.length < MIN_IMAGES) {
      throw new AIServiceError(
        `Registration requires ${MIN_IMAGES}–${MAX_IMAGES} images. Provided: ${imageFiles.length}`,
        "VALIDATION_ERROR",
        { required: MIN_IMAGES, provided: imageFiles.length }
      );
    }

    if (imageFiles.length > MAX_IMAGES) {
      throw new AIServiceError(
        `Maximum ${MAX_IMAGES} images allowed. Provided: ${imageFiles.length}`,
        "VALIDATION_ERROR",
        { max: MAX_IMAGES, provided: imageFiles.length }
      );
    }

    // Upload images to Cloudinary
    const { uploadFaceImage, deleteFaceImages } = await import("../../utils/cloudinary.js");
    const uploadedImages = [];
    const uploadedPublicIds = [];

    try {
      for (const file of imageFiles) {
        const result = await uploadFaceImage(file.buffer);
        uploadedImages.push(result.url);
        uploadedPublicIds.push(result.publicId);
      }
    } catch (uploadError) {
      if (uploadedPublicIds.length > 0) {
        try { await deleteFaceImages(uploadedPublicIds); } catch (_) { /* cleanup best-effort */ }
      }
      throw uploadError;
    }

    // Call AI service to extract embeddings
    const formData = new FormData();
    for (const file of imageFiles) {
      formData.append("images", file.buffer, {
        filename: file.originalname || "face.jpg",
        contentType: file.mimetype || "image/jpeg",
      });
    }

    // Append liveness data
    if (livenessData) {
      formData.append("liveness_success", "true");
      formData.append("liveness_passed", "true");
      if (livenessData.liveness_confidence !== undefined) {
        formData.append("liveness_confidence", livenessData.liveness_confidence.toString());
      }
      if (livenessData.liveness_challenge) {
        formData.append("liveness_challenge", livenessData.liveness_challenge);
      }
    }

    let aiResponse;
    try {
      aiResponse = await aiServiceClient.registerFaces(formData);
    } catch (error) {
      // Cleanup uploaded images on AI failure
      if (uploadedPublicIds.length > 0) {
        try { await deleteFaceImages(uploadedPublicIds); } catch (_) { /* cleanup */ }
      }
      this._handleAIError(error);
    }

    if (aiResponse.status >= 400 || !aiResponse.data.success) {
      if (uploadedPublicIds.length > 0) {
        try { await deleteFaceImages(uploadedPublicIds); } catch (_) { /* cleanup */ }
      }
      this._throwFromAIResponse(aiResponse);
    }

    // Extract individual embeddings
    const individualEmbeddings = aiResponse.data.faces.map((face) => face.embedding);

    if (individualEmbeddings.length < MIN_IMAGES) {
      if (uploadedPublicIds.length > 0) {
        try { await deleteFaceImages(uploadedPublicIds); } catch (_) { /* cleanup */ }
      }
      throw new AIServiceError(
        `Only ${individualEmbeddings.length} valid face(s) detected, minimum ${MIN_IMAGES} required.`,
        "VALIDATION_ERROR",
        { valid_faces: individualEmbeddings.length, required: MIN_IMAGES }
      );
    }

    // Compute mean embedding
    const meanEmbedding = FaceService.computeMeanEmbedding(individualEmbeddings);

    // Store old publicIds for cleanup
    const oldPublicIds = user.faceData?.faceImagePublicIds || [];

    // Save to user profile — mean embedding first, then individuals
    user.faceData = {
      isRegistered: true,
      embeddings: [meanEmbedding, ...individualEmbeddings],
      registeredAt: new Date(),
      faceImages: uploadedImages,
      faceImagePublicIds: uploadedPublicIds,
      lastVerifiedAt: null,
    };

    await user.save();

    // Cleanup old images
    if (oldPublicIds.length > 0) {
      try { await deleteFaceImages(oldPublicIds); } catch (_) { /* best-effort */ }
    }

    // Log activity
    await logActivityWithoutRequest({
      userId: user._id,
      action: "register_face",
      entityType: "user",
      entityId: user._id,
      details: {
        description: "Face registered via unified scan endpoint",
        imageCount: uploadedImages.length,
        validFaces: individualEmbeddings.length,
        timestamp: new Date(),
      },
      status: "success",
    });

    return {
      status: "registered",
      message: "Face registered successfully",
    };
  }

  /**
   * Verification + attendance sub-flow for faceScan
   * @private
   */
  async _scanVerify(user, imageFiles, deviceId) {
    const candidateImage = imageFiles[0]; // Use first image for verification

    // Call AI service to verify
    const formData = new FormData();
    formData.append("image", candidateImage.buffer, {
      filename: "verify.jpg",
      contentType: candidateImage.mimetype || "image/jpeg",
    });
    formData.append(
      "reference_embeddings_json",
      JSON.stringify(user.faceData.embeddings)
    );
    formData.append(
      "threshold",
      FACE_RECOGNITION_CONFIG.SCAN_SIMILARITY_THRESHOLD.toString()
    );

    let aiResponse;
    try {
      aiResponse = await aiServiceClient.verifyFace(formData);
    } catch (error) {
      this._handleAIError(error);
    }

    if (aiResponse.status >= 400 || aiResponse.data.error) {
      this._throwFromAIResponse(aiResponse);
    }

    const similarity = aiResponse.data.similarity;
    const threshold = FACE_RECOGNITION_CONFIG.SCAN_SIMILARITY_THRESHOLD;
    const isMatch = similarity >= threshold;

    if (!isMatch) {
      throw new FaceVerificationFailedError(
        `Face verification failed. Similarity: ${(similarity * 100).toFixed(1)}%, required: ${(threshold * 100).toFixed(1)}%`,
        similarity,
        threshold
      );
    }

    // ── Record attendance ────────────────────────────────────────────────
    const { AttendanceModel } = await import("../attendance/attendance.model.js");

    const now = new Date();
    const dateOnly = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    let attendance = await AttendanceModel.findOne({ userId: user._id, date: dateOnly });
    let action = "check_in";

    if (!attendance) {
      // First scan today → check-in
      attendance = new AttendanceModel({
        userId: user._id,
        date: dateOnly,
        checkIn: now,
        status: "present",
      });
    } else if (!attendance.checkOut) {
      // Already checked in, no check-out → check-out
      attendance.checkOut = now;
      attendance.calculateWorkHours();
      action = "check_out";
    } else {
      // Already has both check-in and check-out
      // Update lastVerifiedAt for face data
      user.faceData.lastVerifiedAt = now;
      await user.save();

      return {
        status: "verified",
        confidence: similarity,
        attendanceRecorded: false,
        message: "Face verified successfully. Attendance already recorded for today.",
      };
    }

    try {
      await attendance.save();
    } catch (saveError) {
      // Handle duplicate key error from concurrent requests
      if (saveError.code === 11000) {
        // Another request already created the attendance record — refetch and retry
        attendance = await AttendanceModel.findOne({ userId: user._id, date: dateOnly });
        if (attendance && !attendance.checkOut) {
          attendance.checkOut = now;
          attendance.calculateWorkHours();
          action = "check_out";
          await attendance.save();
        } else {
          return {
            status: "verified",
            confidence: similarity,
            attendanceRecorded: false,
            message: "Face verified successfully. Attendance already recorded for today.",
          };
        }
      } else {
        throw saveError;
      }
    }

    // Update face lastVerifiedAt
    user.faceData.lastVerifiedAt = now;
    await user.save();

    // Log activity
    await logActivityWithoutRequest({
      userId: user._id,
      action: `face_scan_${action}`,
      entityType: "attendance",
      entityId: attendance._id,
      details: {
        description: `Attendance ${action} via face scan`,
        confidence: similarity,
        deviceId: deviceId || null,
        timestamp: now,
      },
      status: "success",
    });

    return {
      status: "verified",
      confidence: similarity,
      attendanceRecorded: true,
      action, // "check_in" | "check_out"
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut || null,
      workHours: attendance.workHours || 0,
    };
  }

  // ==========================================================================
  // HELPERS (shared by scan sub-flows)
  // ==========================================================================

  /**
   * Handle axios/AI connection errors and rethrow as typed errors
   * @private
   */
  _handleAIError(error) {
    if (axios.isAxiosError(error)) {
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        const data = error.response.data || {};
        const code = data.error_code || "AI_SERVICE_ERROR";
        const msg = data.error || data.detail || "AI service error";
        const details = data.error_details || null;
        switch (code) {
          case "NO_FACE_DETECTED": throw new FaceNotDetectedError(msg, details);
          case "MULTIPLE_FACES": throw new MultipleFacesError(msg, details);
          case "POOR_IMAGE_QUALITY": throw new PoorImageQualityError(msg, details);
          case "SPOOF_DETECTED": throw new SpoofDetectedError(msg, details);
          default: throw new AIServiceError(msg, code, details);
        }
      }
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        throw new AIServiceTimeoutError();
      }
      if (error.code === "ECONNREFUSED" || error.message?.includes("circuit breaker") || error.message?.includes("unavailable")) {
        throw new AIServiceUnavailableError();
      }
    }
    throw error;
  }

  /**
   * Throw a typed error from an AI service non-200 response
   * @private
   */
  _throwFromAIResponse(aiResponse) {
    const data = aiResponse.data || {};
    const code = data.error_code || "AI_SERVICE_ERROR";
    const msg = data.error || data.detail || "AI service error";
    const details = data.error_details || null;
    switch (code) {
      case "NO_FACE_DETECTED": throw new FaceNotDetectedError(msg, details);
      case "MULTIPLE_FACES": throw new MultipleFacesError(msg, details);
      case "POOR_IMAGE_QUALITY": throw new PoorImageQualityError(msg, details);
      case "SPOOF_DETECTED": throw new SpoofDetectedError(msg, details);
      default: throw new AIServiceError(msg, code, details);
    }
  }
}





