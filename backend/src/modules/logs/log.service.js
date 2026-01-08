import { LogModel } from "./log.model.js";
import { UserModel } from "../users/user.model.js";

export class LogService {
  /**
   * Test function để verify warning detection logic
   * Chỉ dùng cho testing purposes
   */
  static async testWarningScenarios() {
    const testCases = [
      // Test login từ IP mới
      {
        action: 'login',
        details: { newLocation: true },
        expectedStatus: 'warning'
      },
      // Test thao tác bulk
      {
        action: 'delete_users',
        details: { count: 10 },
        expectedStatus: 'warning'
      },
      // Test thay đổi role nhạy cảm
      {
        action: 'update_user',
        details: { roleChanged: true, newRole: 'SUPER_ADMIN' },
        expectedStatus: 'warning'
      },
      // Test upload file lớn
      {
        action: 'upload_file',
        details: { fileSize: 100 * 1024 * 1024 }, // 100MB
        expectedStatus: 'warning'
      },
      // Test action bình thường
      {
        action: 'get_user',
        details: {},
        expectedStatus: 'success'
      },
      // Test action failed
      {
        action: 'update_user',
        details: {},
        errorMessage: 'User not found',
        expectedStatus: 'failed'
      }
    ];

    const results = testCases.map(testCase => {
      const determinedStatus = this.determineLogStatus(
        testCase.action,
        testCase.details,
        testCase.errorMessage
      );

      return {
        ...testCase,
        determinedStatus,
        passed: determinedStatus === testCase.expectedStatus
      };
    });

    return results;
  }
  /**
   * Lấy danh sách audit logs với pagination, search và filters
   */
  static async getAllLogs(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = "",
      action = "",
      status = "",
      category = "",
      userId = "",
      startDate = "",
      endDate = "",
    } = options;

    const query = {};

    // Search filter - search in action, entityType, details, và userName
    if (search) {
      // Tìm users có name/email match với search
      try {
        const users = await UserModel.find({
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
          ]
        }).select('_id');

        const userIds = users.map(u => u._id);

        query.$or = [
          { action: { $regex: search, $options: "i" } },
          { entityType: { $regex: search, $options: "i" } },
          { "details.description": { $regex: search, $options: "i" } },
          ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : [])
        ];
      } catch (err) {
        // Nếu có lỗi khi tìm users, chỉ search trong các fields khác
        query.$or = [
          { action: { $regex: search, $options: "i" } },
          { entityType: { $regex: search, $options: "i" } },
          { "details.description": { $regex: search, $options: "i" } },
        ];
      }
    }

    // Action filter
    if (action && action !== "all") {
      query.action = action;
    }

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Category filter (entityType)
    if (category && category !== "all") {
      query.entityType = category;
    }

    // User filter
    if (userId) {
      query.userId = userId;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateObj;
      }
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      LogModel.find(query)
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      LogModel.countDocuments(query),
    ]);

    // Format logs for frontend
    const formattedLogs = logs.map((log) => {
      const user = log.userId;
      return {
        id: log._id.toString(),
        timestamp: log.createdAt.toISOString().replace("T", " ").slice(0, 19),
        userId: user?._id?.toString() || "SYSTEM",
        userName: user?.name || "System",
        userRole: user?.role || "SYSTEM",
        action: log.action,
        category: this.mapEntityTypeToCategory(log.entityType),
        resource: log.entityType || "Unknown",
        description: log.details?.description || log.action || "Action performed",
        ipAddress: log.ipAddress || "N/A",
        status: log.status || "success",
        metadata: log.details || {},
      };
    });

    return {
      logs: formattedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Map entityType to category for frontend
   */
  static mapEntityTypeToCategory(entityType) {
    if (!entityType) return "system";

    const categoryMap = {
      attendance: "attendance",
      request: "request",
      user: "user",
      auth: "auth",
      settings: "settings",
      system: "system",
    };

    return categoryMap[entityType.toLowerCase()] || "system";
  }

  /**
   * Lấy chi tiết một log entry theo ID
   */
  static async getLogById(logId) {
    const log = await LogModel.findById(logId)
      .populate("userId", "name email role");

    if (!log) {
      throw new Error("Log not found");
    }

    const user = log.userId;

    return {
      id: log._id.toString(),
      timestamp: log.createdAt.toISOString(),
      userId: user?._id?.toString() || "SYSTEM",
      userName: user?.name || "System",
      userEmail: user?.email || null,
      userRole: user?.role || "SYSTEM",
      action: log.action,
      category: this.mapEntityTypeToCategory(log.entityType),
      resource: log.entityType || "Unknown",
      description: log.details?.description || log.action || "Action performed",
      ipAddress: log.ipAddress || "N/A",
      userAgent: log.userAgent || "N/A",
      status: log.status || "success",
      errorMessage: log.errorMessage || null,
      entityId: log.entityId?.toString() || null,
      metadata: log.details || {},
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    };
  }

  /**
   * Helper function để tạo log entry
   * @param {Object} options
   * @param {string} options.userId - User ID thực hiện action (optional)
   * @param {string} options.action - Tên action (VD: "update_user", "login")
   * @param {string} options.entityType - Loại entity (VD: "user", "attendance")
   * @param {string} options.entityId - ID của entity (optional)
   * @param {Object} options.details - Thông tin chi tiết (optional)
   * @param {string} options.ipAddress - IP address (optional)
   * @param {string} options.userAgent - User agent (optional)
   * @param {string} options.status - "success" | "failed" (default: "success")
   * @param {string} options.errorMessage - Error message nếu failed (optional)
   * @returns {Promise<Object|null>} Log entry hoặc null nếu có lỗi
   */
  static async createLog(options) {
    try {
      const log = await LogModel.create({
        userId: options.userId || null,
        action: options.action,
        entityType: options.entityType || null,
        entityId: options.entityId || null,
        details: options.details || {},
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        status: options.status || "success",
        errorMessage: options.errorMessage || null,
      });

      return log;
    } catch (error) {
      // Không throw error khi log fail để không ảnh hưởng business logic
      return null;
    }
  }

  /**
   * Xác định status của log dựa trên action và context
   * @param {string} action - Tên action
   * @param {Object} details - Chi tiết của action
   * @param {string} errorMessage - Error message nếu có
   * @returns {string} - "success", "failed", hoặc "warning"
   */
  static determineLogStatus(action, details = {}, errorMessage = null) {
    // Nếu có error message, luôn là failed
    if (errorMessage) {
      return "failed";
    }

    // Kiểm tra các hoạt động đáng ngờ
    if (this.isSuspiciousActivity(action, details)) {
      return "warning";
    }

    // Mặc định là success
    return "success";
  }

  /**
   * Kiểm tra xem activity có đáng ngờ không
   * @param {string} action - Tên action
   * @param {Object} details - Chi tiết của action
   * @returns {boolean} - true nếu là hoạt động đáng ngờ
   */
  static isSuspiciousActivity(action, details = {}) {
    // 1. Login từ IP mới hoặc địa điểm mới
    if (action === 'login' && (details.newLocation || details.suspiciousLogin)) {
      return true;
    }

    // 2. Thao tác bulk (xóa/sửa nhiều records cùng lúc)
    if ((action === 'delete_users' || action === 'update_users' || action === 'bulk_update') &&
        details.count > 5) {
      return true;
    }

    // 3. Thay đổi quyền hạn nhạy cảm
    if (action === 'update_user' && details.roleChanged) {
      const sensitiveRoles = ['SUPER_ADMIN', 'ADMIN'];
      if (sensitiveRoles.includes(details.newRole) || sensitiveRoles.includes(details.oldRole)) {
        return true;
      }
    }

    // 4. Thay đổi cài đặt hệ thống quan trọng
    if (action === 'update_settings' && details.sensitiveSetting) {
      return true;
    }

    // 5. Thao tác trên tài khoản bị vô hiệu hóa
    if ((action === 'login' || action === 'update_user') && details.accountDisabled) {
      return true;
    }

    // 6. Upload file có kích thước bất thường (> 50MB)
    if (action === 'upload_file' && details.fileSize > 50 * 1024 * 1024) {
      return true;
    }

    // 7. API rate limiting violations
    if (action === 'rate_limit_exceeded') {
      return true;
    }

    // 8. Thay đổi mật khẩu nhiều lần trong ngày
    if (action === 'change_password' && details.multipleChangesInDay) {
      return true;
    }

    return false;
  }

  /**
   * Lấy thống kê audit logs
   */
  static async getLogStats(options = {}) {
    const { startDate = "", endDate = "" } = options;

    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateObj;
      }
    }

    const [total, success, failed, warning] = await Promise.all([
      LogModel.countDocuments(query),
      LogModel.countDocuments({ ...query, status: "success" }),
      LogModel.countDocuments({ ...query, status: "failed" }),
      LogModel.countDocuments({ ...query, status: "warning" }),
    ]);

    return {
      total,
      success,
      failed,
      warning,
    };
  }
}


