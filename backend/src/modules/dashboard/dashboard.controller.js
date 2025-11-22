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
      const stats = await DashboardService.getDashboardStats();
      return res.status(200).json(stats);
    } catch (error) {
      console.error("[DashboardController] getDashboardStats error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }
}

