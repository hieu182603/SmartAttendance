import { Router } from "express";
import { FaceController } from "./face.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import multer from "multer";
import rateLimit from "express-rate-limit";

const faceRouter = Router();

// Apply auth middleware to all routes
faceRouter.use(authMiddleware);

// Rate limiting for face operations (prevent abuse)
const faceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many face recognition requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for multiple file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10, // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

/**
 * @route   POST /api/face/register
 * @desc    Register user face with 5-7 images
 * @access  Private
 */
faceRouter.post(
  "/register",
  faceRateLimit,
  upload.array("images", 10),
  FaceController.registerFace
);

/**
 * @route   GET /api/face/status
 * @desc    Get user face registration status
 * @access  Private
 */
faceRouter.get("/status", FaceController.getFaceStatus);

/**
 * @route   PUT /api/face/register
 * @desc    Update user face data
 * @access  Private
 */
faceRouter.put(
  "/register",
  faceRateLimit,
  upload.array("images", 10),
  FaceController.updateFace
);

/**
 * @route   DELETE /api/face/register
 * @desc    Delete user face data
 * @access  Private
 */
faceRouter.delete("/register", FaceController.deleteFace);

export { faceRouter };
























