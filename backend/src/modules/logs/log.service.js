import { LogModel } from "./log.model.js";
import { UserModel } from "../users/user.model.js";

export class LogService {
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

    const [total, success, failed] = await Promise.all([
      LogModel.countDocuments(query),
      LogModel.countDocuments({ ...query, status: "success" }),
      LogModel.countDocuments({ ...query, status: "failed" }),
    ]);

    return {
      total,
      success,
      failed,
      warning: 0, // Log model doesn't have warning status, but frontend expects it
    };
  }
}


