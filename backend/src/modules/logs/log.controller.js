import { LogService } from "./log.service.js";

export const LogController = {
  /**
   * GET /api/logs
   * Lấy danh sách audit logs với pagination và filters
   * Chỉ dành cho SUPER_ADMIN và ADMIN
   */
  async getAllLogs(req, res) {
    try {
      const {
        page,
        limit,
        search,
        action,
        status,
        category,
        userId,
        startDate,
        endDate,
      } = req.query;

      const result = await LogService.getAllLogs({
        page,
        limit,
        search,
        action,
        status,
        category,
        userId,
        startDate,
        endDate,
      });

      res.status(200).json(result);
    } catch (error) {
      console.error("[LogController] Get all logs error:", error);
      res.status(500).json({
        message: error.message || "Không thể lấy danh sách audit logs",
      });
    }
  },

  /**
   * GET /api/logs/stats
   * Lấy thống kê audit logs
   */
  async getLogStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const stats = await LogService.getLogStats({
        startDate,
        endDate,
      });

      res.status(200).json(stats);
    } catch (error) {
      console.error("[LogController] Get log stats error:", error);
      res.status(500).json({
        message: error.message || "Không thể lấy thống kê audit logs",
      });
    }
  }
}

