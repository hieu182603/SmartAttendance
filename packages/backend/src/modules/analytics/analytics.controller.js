import { AnalyticsService } from "./analytics.service.js";

export class AnalyticsController {
  /**
   * @swagger
   * /api/analytics/report:
   *   get:
   *     summary: Get full Google Analytics report (SUPER_ADMIN only)
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: range
   *         schema:
   *           type: string
   *           enum: [today, 7days, 30days, 90days]
   *           default: 7days
   *         description: Date range for the report
   *     responses:
   *       200:
   *         description: Full analytics report with overview, trends, pages, channels, devices, locations
   *       403:
   *         description: Insufficient permissions
   *       500:
   *         description: Server error
   */
  static async getReport(req, res) {
    try {
      if (!AnalyticsService.isConfigured()) {
        return res.status(503).json({
          message: "Google Analytics is not configured. Set GA_PROPERTY_ID and GA_SERVICE_ACCOUNT_KEY (base64) or GA_SERVICE_ACCOUNT_KEY_PATH in .env",
          configured: false,
        });
      }

      const range = req.query.range || "7days";
      const validRanges = ["today", "7days", "30days", "90days"];
      if (!validRanges.includes(range)) {
        return res.status(400).json({ message: "Invalid range. Use: today, 7days, 30days, 90days" });
      }

      const report = await AnalyticsService.getFullReport(range);
      return res.status(200).json({ ...report, configured: true });
    } catch (error) {
      console.error("[AnalyticsController] getReport error:", error);
      return res.status(500).json({
        message: error.message || "Failed to fetch analytics data",
        configured: AnalyticsService.isConfigured(),
      });
    }
  }

  /**
   * @swagger
   * /api/analytics/realtime:
   *   get:
   *     summary: Get real-time active users count (SUPER_ADMIN only)
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Real-time active users
   */
  static async getRealtime(req, res) {
    try {
      if (!AnalyticsService.isConfigured()) {
        return res.status(503).json({ configured: false, activeUsers: 0 });
      }

      const data = await AnalyticsService.getActiveUsers();
      return res.status(200).json({ ...data, configured: true });
    } catch (error) {
      console.error("[AnalyticsController] getRealtime error:", error);
      return res.status(500).json({
        message: error.message || "Failed to fetch realtime data",
        activeUsers: 0,
      });
    }
  }
}
