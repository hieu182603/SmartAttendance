import { UpgradeService } from "./upgrade.service.js";

export class UpgradeController {
  /**
   * Upgrade trial user
   */
  static async upgradeTrialUser(req, res) {
    try {
      const userId = req.user.userId;
      const upgradeData = req.body;

      const result = await UpgradeService.upgradeTrialUser(userId, upgradeData);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Upgrade trial user error:", error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get upgrade options
   */
  static async getUpgradeOptions(req, res) {
    try {
      const options = UpgradeService.getUpgradeOptions();

      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      console.error("Get upgrade options error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Check if current user can be upgraded
   */
  static async checkUpgradeEligibility(req, res) {
    try {
      const userId = req.user.userId;
      const result = await UpgradeService.canUpgradeUser(userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Check upgrade eligibility error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Get trial statistics (admin only)
   */
  static async getTrialStats(req, res) {
    try {
      const stats = await UpgradeService.getTrialStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Get trial stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
}
