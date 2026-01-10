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
  getAvailablePeriods,
} from "./performance.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";

export const performanceRouter = express.Router();

// Tất cả routes đều cần authentication
performanceRouter.use(authMiddleware);

/**
 * @swagger
 * /api/performance/reviews:
 *   get:
 *     summary: Lấy danh sách đánh giá (tất cả authenticated users, filtering theo role trong controller)
 *     tags: [Performance]
 */
performanceRouter.get("/reviews", getReviews);

/**
 * @swagger
 * /api/performance/stats:
 *   get:
 *     summary: Lấy thống kê đánh giá (tất cả authenticated users, filtering theo role trong controller)
 *     tags: [Performance]
 */
performanceRouter.get("/stats", getStats);

/**
 * @swagger
 * /api/performance/reviews/:id:
 *   get:
 *     summary: Lấy chi tiết đánh giá (tất cả authenticated users)
 *     tags: [Performance]
 */
performanceRouter.get("/reviews/:id", getReviewById);

/**
 * @swagger
 * /api/performance/reviews:
 *   post:
 *     summary: Tạo đánh giá mới (SUPERVISOR trở lên)
 *     tags: [Performance]
 */
performanceRouter.post("/reviews", requireRole([ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]), createReview);

/**
 * @swagger
 * /api/performance/reviews/:id:
 *   put:
 *     summary: Cập nhật đánh giá (SUPERVISOR trở lên)
 *     tags: [Performance]
 */
performanceRouter.put("/reviews/:id", requireRole([ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]), updateReview);

/**
 * @swagger
 * /api/performance/reviews/:id:
 *   delete:
 *     summary: Xóa đánh giá (SUPERVISOR trở lên)
 *     tags: [Performance]
 */
performanceRouter.delete("/reviews/:id", requireRole([ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]), deleteReview);

/**
 * @swagger
 * /api/performance/employee/:employeeId:
 *   get:
 *     summary: Lấy đánh giá của 1 nhân viên (tất cả authenticated users, filtering theo role trong controller)
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
 *     summary: Reject đánh giá (HR_MANAGER trở lên)
 *     tags: [Performance]
 */
performanceRouter.put("/reviews/:id/reject", requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]), rejectReview);

/**
 * @swagger
 * /api/performance/export:
 *   get:
 *     summary: Export đánh giá ra CSV (HR_MANAGER trở lên)
 *     tags: [Performance]
 */
performanceRouter.get("/export", requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]), exportReviews);

/**
 * @swagger
 * /api/performance/periods:
 *   get:
 *     summary: Lấy danh sách periods có trong database (tất cả authenticated users)
 *     tags: [Performance]
 */
performanceRouter.get("/periods", getAvailablePeriods);
