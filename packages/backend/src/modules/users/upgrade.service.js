import { UserModel } from "./user.model.js";
import { ROLES } from "../../config/roles.config.js";

export class UpgradeService {
  /**
   * Upgrade trial user lên role cao hơn
   */
  static async upgradeTrialUser(userId, upgradeData) {
    const { targetRole, paymentMethod } = upgradeData;

    // Validate input
    if (!targetRole) {
      throw new Error("Target role is required");
    }

    // Find user
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is trial user
    if (!user.isTrial) {
      throw new Error("User is not a trial user");
    }

    // Check if trial has expired
    if (user.trialExpiresAt && new Date() > user.trialExpiresAt) {
      throw new Error("Trial period has expired. Please contact support.");
    }

    // Validate target role
    const validRoles = [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR_MANAGER, ROLES.ADMIN];
    if (!validRoles.includes(targetRole)) {
      throw new Error("Invalid target role. Can only upgrade to: EMPLOYEE, MANAGER, HR_MANAGER, ADMIN");
    }

    // Update user
    user.role = targetRole;
    user.isTrial = false;
    user.trialConvertedAt = new Date();

    // Add any additional fields based on role
    // For example, initialize leave balance if upgrading to EMPLOYEE
    if (targetRole === ROLES.EMPLOYEE) {
      user.initializeLeaveBalance();
    }

    await user.save();

    // Log the upgrade (you might want to add audit logging here)
    console.log(`User ${user.email} upgraded from TRIAL to ${targetRole}`);

    return {
      message: "Account upgraded successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isTrial: user.isTrial,
        trialConvertedAt: user.trialConvertedAt,
      },
      upgradeDetails: {
        fromRole: ROLES.TRIAL,
        toRole: targetRole,
        convertedAt: user.trialConvertedAt,
        paymentMethod: paymentMethod || "trial_upgrade",
      }
    };
  }

  /**
   * Get upgrade options available for trial users
   */
  static getUpgradeOptions() {
    return {
      plans: [
        {
          id: "individual",
          name: "Cá nhân",
          role: ROLES.EMPLOYEE,
          price: 29,
          currency: "USD",
          period: "monthly",
          features: [
            "Quản lý chấm công cá nhân",
            "Tạo và theo dõi yêu cầu nghỉ phép",
            "Xem lịch làm việc và công ty",
            "Báo cáo chấm công cá nhân",
            "Thông báo thời gian thực",
            "Hỗ trợ cơ bản"
          ]
        },
        {
          id: "team",
          name: "Nhóm",
          role: ROLES.MANAGER,
          price: 99,
          currency: "USD",
          period: "monthly",
          features: [
            "Tất cả tính năng Cá nhân",
            "Quản lý đội nhóm (lên đến 20 nhân viên)",
            "Phê duyệt yêu cầu nghỉ phép",
            "Phân tích hiệu suất đội nhóm",
            "Báo cáo chi tiết",
            "Hỗ trợ ưu tiên"
          ]
        },
        {
          id: "enterprise",
          name: "Doanh nghiệp",
          role: ROLES.HR_MANAGER,
          price: 299,
          currency: "USD",
          period: "monthly",
          features: [
            "Tất cả tính năng Nhóm",
            "Quản lý nhân sự không giới hạn",
            "Quản lý phòng ban và chi nhánh",
            "Phân tích nâng cao và báo cáo",
            "Tích hợp với hệ thống khác",
            "Hỗ trợ 24/7",
            "Tùy chỉnh theo yêu cầu"
          ]
        }
      ]
    };
  }

  /**
   * Check if user can be upgraded
   */
  static async canUpgradeUser(userId) {
    const user = await UserModel.findById(userId).select("isTrial trialExpiresAt").lean();
    if (!user) {
      return { canUpgrade: false, reason: "User not found" };
    }

    if (!user.isTrial) {
      return { canUpgrade: false, reason: "User is not a trial user" };
    }

    if (user.trialExpiresAt && new Date() > user.trialExpiresAt) {
      return { canUpgrade: false, reason: "Trial has expired" };
    }

    return { canUpgrade: true };
  }

  /**
   * Get trial statistics for admin
   */
  static async getTrialStats() {
    const now = new Date();

    const [
      totalTrialUsers,
      activeTrialUsers,
      expiredTrialUsers,
      convertedUsers
    ] = await Promise.all([
      UserModel.countDocuments({ isTrial: true }),
      UserModel.countDocuments({
        isTrial: true,
        trialExpiresAt: { $gt: now }
      }),
      UserModel.countDocuments({
        isTrial: true,
        trialExpiresAt: { $lte: now }
      }),
      UserModel.countDocuments({
        isTrial: false,
        trialConvertedAt: { $exists: true }
      })
    ]);

    const conversionRate = totalTrialUsers > 0 ? (convertedUsers / totalTrialUsers * 100).toFixed(2) : 0;

    return {
      totalTrialUsers,
      activeTrialUsers,
      expiredTrialUsers,
      convertedUsers,
      conversionRate: `${conversionRate}%`,
      timestamp: now
    };
  }
}
