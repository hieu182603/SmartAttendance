import { LogService } from "../modules/logs/log.service.js";

/**
 * Helper function để log activity từ bất kỳ module nào
 * Tự động extract IP address và User Agent từ request
 * 
 * @param {Object} req - Express request object
 * @param {Object} options - Log options
 * @param {string} options.action - Tên action (VD: "update_user", "login")
 * @param {string} options.entityType - Loại entity (VD: "user", "attendance")
 * @param {string} options.entityId - ID của entity (optional)
 * @param {Object} options.details - Thông tin chi tiết (optional)
 * @param {string} options.status - "success" | "failed" (default: "success")
 * @param {string} options.errorMessage - Error message nếu failed (optional)
 * @returns {Promise<void>}
 * 
 * @example
 * // Log successful action
 * await logActivity(req, {
 *   action: "update_user",
 *   entityType: "user",
 *   entityId: userId,
 *   details: { description: "Updated user info" },
 *   status: "success"
 * });
 * 
 * // Log failed action
 * await logActivity(req, {
 *   action: "login",
 *   entityType: "auth",
 *   details: { description: "Login failed" },
 *   status: "failed",
 *   errorMessage: "Invalid credentials"
 * });
 */
export const logActivity = async (req, options) => {
    try {
        // Extract IP address từ request
        const ipAddress =
            req.ip ||
            req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            null;

        // Extract User Agent từ request headers
        const userAgent = req.headers['user-agent'] || 'Unknown';

        // Extract userId từ req.user (set bởi authMiddleware)
        const userId = req.user?.userId || null;

        // Tạo log entry
        await LogService.createLog({
            userId,
            action: options.action,
            entityType: options.entityType || null,
            entityId: options.entityId || null,
            details: options.details || {},
            ipAddress,
            userAgent,
            status: options.status || 'success',
            errorMessage: options.errorMessage || null,
        });
    } catch (error) {
        // Không throw error để không ảnh hưởng business logic
        // Silent fail
    }
};

/**
 * Helper function để log activity mà không cần request object
 * Dùng khi log system actions hoặc background jobs
 * 
 * @param {Object} options - Log options
 * @param {string} options.userId - User ID (optional, có thể là null cho system actions)
 * @param {string} options.action - Tên action
 * @param {string} options.entityType - Loại entity
 * @param {string} options.entityId - ID của entity (optional)
 * @param {Object} options.details - Thông tin chi tiết (optional)
 * @param {string} options.status - "success" | "failed" (default: "success")
 * @param {string} options.errorMessage - Error message nếu failed (optional)
 * @returns {Promise<void>}
 */
export const logActivityWithoutRequest = async (options) => {
    try {
        await LogService.createLog({
            userId: options.userId || null,
            action: options.action,
            entityType: options.entityType || null,
            entityId: options.entityId || null,
            details: options.details || {},
            ipAddress: null,
            userAgent: null,
            status: options.status || 'success',
            errorMessage: options.errorMessage || null,
        });
    } catch (error) {
        console.error("[logger.util] Error logging activity:", error);
    }
};



