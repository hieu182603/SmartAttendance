import express from "express";
import {
  getReviews,
  getStats,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  getReviewsByEmployee,
  getMyReviews,
  rejectReview,
  exportReviews,
} from "./performance.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

export const performanceRouter = express.Router();

// Tất cả routes đều cần authentication
performanceRouter.use(authMiddleware);

/**
 * @swagger
 * /api/performance/reviews:
 *   get:
 *     summary: Lấy danh sách đánh giá
 *     tags: [Performance]
 */
performanceRouter.get("/reviews", getReviews);

/**
 * @swagger
 * /api/performance/stats:
 *   get:
 *     summary: Lấy thống kê đánh giá
 *     tags: [Performance]
 */
performanceRouter.get("/stats", getStats);

/**
 * @swagger
 * /api/performance/reviews/:id:
 *   get:
 *     summary: Lấy chi tiết đánh giá
 *     tags: [Performance]
 */
performanceRouter.get("/reviews/:id", getReviewById);

/**
 * @swagger
 * /api/performance/reviews:
 *   post:
 *     summary: Tạo đánh giá mới
 *     tags: [Performance]
 */
performanceRouter.post("/reviews", createReview);

/**
 * @swagger
 * /api/performance/reviews/:id:
 *   put:
 *     summary: Cập nhật đánh giá
 *     tags: [Performance]
 */
performanceRouter.put("/reviews/:id", updateReview);

/**
 * @swagger
 * /api/performance/reviews/:id:
 *   delete:
 *     summary: Xóa đánh giá
 *     tags: [Performance]
 */
performanceRouter.delete("/reviews/:id", deleteReview);

/**
 * @swagger
 * /api/performance/employee/:employeeId:
 *   get:
 *     summary: Lấy đánh giá của 1 nhân viên
 *     tags: [Performance]
 */
performanceRouter.get("/employee/:employeeId", getReviewsByEmployee);

/**
 * @swagger
 * /api/performance/my-reviews:
 *   get:
 *     summary: Lấy đánh giá của chính mình (EMPLOYEE)
 *     tags: [Performance]
 */
performanceRouter.get("/my-reviews", getMyReviews);

/**
 * @swagger
 * /api/performance/reviews/:id/reject:
 *   put:
 *     summary: Reject đánh giá (HR+)
 *     tags: [Performance]
 */
performanceRouter.put("/reviews/:id/reject", rejectReview);

/**
 * @swagger
 * /api/performance/export:
 *   get:
 *     summary: Export đánh giá ra CSV (HR+)
 *     tags: [Performance]
 */
performanceRouter.get("/export", exportReviews);
