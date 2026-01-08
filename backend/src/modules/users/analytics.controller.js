import { AnalyticsService } from "./analytics.service.js";

export class AnalyticsController {
  /**
   * Get comprehensive trial analytics
   */
  static async getTrialAnalytics(req, res) {
    try {
      const analytics = await AnalyticsService.getTrialAnalytics();

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error("Get trial analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Track user activity (for future use)
   */
  static async trackActivity(req, res) {
    try {
      const { userId } = req.user;
      const { activityType, metadata } = req.body;

      await AnalyticsService.trackUserActivity(userId, activityType, metadata);

      res.json({
        success: true,
        message: "Activity tracked successfully"
      });
    } catch (error) {
      console.error("Track activity error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
}
