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

/**
 * Face Service - Handles face registration and verification
 */
export class FaceService {
  /**
   * Register user face with multiple images
   * @param {string} userId - User ID
   * @param {Array<Express.Multer.File>} imageFiles - Array of image files
   * @returns {Promise<{success: boolean, embeddings: Array, faceImages: Array, errors?: Array}>}
   */
  async registerUserFace(userId, imageFiles) {
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
        const errorMessage = aiResponse.data.error || aiResponse.data.detail || "Face registration failed";
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
        error instanceof AIServiceError
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
   * @returns {Promise<{success: boolean, embeddings: Array, faceImages: Array}>}
   */
  async updateUserFace(userId, newImageFiles, mode = "replace") {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (mode === "replace") {
        // Delete old embeddings and register new ones
        return await this.registerUserFace(userId, newImageFiles);
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
}





