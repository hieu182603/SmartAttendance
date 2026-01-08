import { LogService } from "../modules/logs/log.service.js";

// Cache để track hoạt động của user (để phát hiện suspicious activity)
// Format: { userId: { ipAddresses: Set, lastLoginTime: Date, loginCount: number, etc. } }
const userActivityCache = new Map();

// Helper function để detect suspicious activities
const detectSuspiciousActivity = async (userId, action, details, currentIp) => {
    if (!userId) return {};

    const flags = {};

    try {
        // Khởi tạo cache cho user nếu chưa có
        if (!userActivityCache.has(userId)) {
            userActivityCache.set(userId, {
                ipAddresses: new Set(),
                lastLoginTime: null,
                loginCount: 0,
                passwordChanges: [],
                recentActions: [],
            });
        }

        const userCache = userActivityCache.get(userId);

        // 1. Phát hiện login từ IP mới
        if (action === 'login' && currentIp) {
            if (!userCache.ipAddresses.has(currentIp)) {
                flags.newLocation = true;
                // Thêm IP mới vào cache (chỉ lưu tối đa 10 IP gần nhất)
                userCache.ipAddresses.add(currentIp);
                if (userCache.ipAddresses.size > 10) {
                    const oldestIp = userCache.ipAddresses.values().next().value;
                    userCache.ipAddresses.delete(oldestIp);
                }
            }
            userCache.lastLoginTime = new Date();
            userCache.loginCount++;
        }

        // 2. Phát hiện thay đổi mật khẩu nhiều lần trong ngày
        if (action === 'change_password') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Lọc các thay đổi mật khẩu trong ngày hôm nay
            const todayChanges = userCache.passwordChanges.filter(change =>
                change >= today
            );

            if (todayChanges.length >= 3) { // Thay đổi quá 3 lần trong ngày
                flags.multipleChangesInDay = true;
            }

            // Thêm thay đổi mới và cleanup cache cũ (giữ 30 ngày)
            userCache.passwordChanges.push(new Date());
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            userCache.passwordChanges = userCache.passwordChanges.filter(change =>
                change >= thirtyDaysAgo
            );
        }

        // 3. Phát hiện thao tác bulk
        if (details && typeof details.count === 'number' && details.count > 5) {
            flags.bulkOperation = true;
        }

        // 4. Phát hiện thay đổi role nhạy cảm
        if (action === 'update_user' && details.roleChanged) {
            flags.roleChanged = true;
            if (details.oldRole === 'SUPER_ADMIN' || details.newRole === 'SUPER_ADMIN') {
                flags.superAdminRoleChange = true;
            }
        }

        // 5. Phát hiện thao tác trên tài khoản bị vô hiệu hóa
        if (details && details.accountDisabled) {
            flags.accountDisabled = true;
        }

        // 6. Phát hiện upload file lớn bất thường
        if (action === 'upload_file' && details.fileSize > 50 * 1024 * 1024) { // > 50MB
            flags.largeFileUpload = true;
        }

        // Track recent actions để phát hiện patterns
        userCache.recentActions.push({
            action,
            timestamp: new Date(),
            ipAddress: currentIp
        });

        // Giữ tối đa 50 actions gần nhất
        if (userCache.recentActions.length > 50) {
            userCache.recentActions = userCache.recentActions.slice(-50);
        }

        // Cleanup cache entries older than 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        userCache.recentActions = userCache.recentActions.filter(action =>
            action.timestamp >= oneDayAgo
        );

        // 7. Phát hiện rate limiting violations
        const recentActions = userCache.recentActions.filter(action =>
            action.timestamp >= new Date(Date.now() - 60000) // 1 phút
        );
        if (recentActions.length > 30) { // > 30 actions trong 1 phút
            flags.rateLimitExceeded = true;
        }

    } catch (error) {
        // Silent fail - không làm gián đoạn logging
        console.warn('[logger.util] Error detecting suspicious activity:', error);
    }

    return flags;
};

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

        // Chuẩn bị details với thông tin bổ sung để detect suspicious activity
        const enhancedDetails = {
            ...options.details,
            ipAddress,
            userAgent,
        };

        // Kiểm tra hoạt động đáng ngờ dựa trên context
        const suspiciousFlags = await detectSuspiciousActivity(userId, options.action, enhancedDetails, ipAddress);

        // Thêm flags vào details
        enhancedDetails.suspiciousFlags = suspiciousFlags;

        // Xác định status dựa trên logic
        const determinedStatus = LogService.determineLogStatus(
            options.action,
            enhancedDetails,
            options.errorMessage
        );

        // Override status nếu được chỉ định rõ ràng, nếu không thì dùng status được xác định
        const finalStatus = options.status || determinedStatus;

        // Tạo log entry
        await LogService.createLog({
            userId,
            action: options.action,
            entityType: options.entityType || null,
            entityId: options.entityId || null,
            details: enhancedDetails,
            ipAddress,
            userAgent,
            status: finalStatus,
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
        // Chuẩn bị details với thông tin bổ sung để detect suspicious activity
        const enhancedDetails = {
            ...options.details,
        };

        // Detect suspicious activity (có thể hạn chế hơn vì không có IP)
        const suspiciousFlags = await detectSuspiciousActivity(
            options.userId,
            options.action,
            enhancedDetails,
            null
        );

        // Thêm flags vào details
        enhancedDetails.suspiciousFlags = suspiciousFlags;

        // Xác định status dựa trên logic
        const determinedStatus = LogService.determineLogStatus(
            options.action,
            enhancedDetails,
            options.errorMessage
        );

        // Override status nếu được chỉ định rõ ràng, nếu không thì dùng status được xác định
        const finalStatus = options.status || determinedStatus;

        await LogService.createLog({
            userId: options.userId || null,
            action: options.action,
            entityType: options.entityType || null,
            entityId: options.entityId || null,
            details: enhancedDetails,
            ipAddress: null,
            userAgent: null,
            status: finalStatus,
            errorMessage: options.errorMessage || null,
        });
    } catch (error) {
        console.error("[logger.util] Error logging activity:", error);
    }
};



