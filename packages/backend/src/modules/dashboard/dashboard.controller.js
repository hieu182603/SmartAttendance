import { DashboardService } from "./dashboard.service.js";

export class DashboardController {
  /**
   * @swagger
   * /api/dashboard/stats:
   *   get:
   *     summary: Lấy thống kê tổng quan cho dashboard (chỉ dành cho ADMIN, HR_MANAGER, MANAGER)
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Thống kê dashboard
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 kpi:
   *                   type: object
   *                   properties:
   *                     totalEmployees:
   *                       type: number
   *                     presentToday:
   *                       type: number
   *                     lateToday:
   *                       type: number
   *                     absentToday:
   *                       type: number
   *                 attendanceData:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       date:
   *                         type: string
   *                       present:
   *                         type: number
   *                       late:
   *                         type: number
   *                       absent:
   *                         type: number
   *                 growthPercentage:
   *                   type: number
   *       403:
   *         description: Không có quyền truy cập
   *       500:
   *         description: Lỗi server
   */
  static async getDashboardStats(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      let departmentFilter = null;

      // For SUPERVISOR, get stats only for their department
      if (userRole === 'SUPERVISOR') {
        const UserModel = (await import("../users/user.model.js")).UserModel;
        const user = await UserModel.findById(userId).select('department');
        if (user && user.department) {
          departmentFilter = user.department;
        }
      }

      const stats = await DashboardService.getDashboardStats(departmentFilter);
      return res.status(200).json(stats);
    } catch (error) {
      console.error("[DashboardController] getDashboardStats error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  /**
   * @swagger
   * /api/dashboard/summary:
   *   get:
   *     summary: Lấy summary cho dashboard (shift, location, workingDays)
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Summary data
   */
  static async getDashboardSummary(req, res) {
    try {
      const userId = req.user.userId;
      const summary = await DashboardService.getDashboardSummary(userId);
      return res.status(200).json(summary);
    } catch (error) {
      console.error("[DashboardController] getDashboardSummary error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  /**
   * @swagger
   * /api/dashboard/pending-actions:
   *   get:
   *     summary: Lấy pending actions (pending requests, unread notifications)
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Pending actions data
   */
  static async getPendingActions(req, res) {
    try {
      const userId = req.user.userId;
      const pendingActions = await DashboardService.getPendingActions(userId);
      return res.status(200).json(pendingActions);
    } catch (error) {
      console.error("[DashboardController] getPendingActions error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }
}



