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

    // Search filter - search in action, entityType, details
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: "i" } },
        { entityType: { $regex: search, $options: "i" } },
        { "details.description": { $regex: search, $options: "i" } },
      ];
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


