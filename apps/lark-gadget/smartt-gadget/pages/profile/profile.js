// pages/profile/profile.js
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    user: {},
    initial: "?",
    t: {},
    theme: "light"
  },

  onShow() {
    const t = i18n.getTranslations();
    this.setData({ t, theme: i18n.getTheme() });

    tt.setNavigationBarTitle({
      title: t.profile.title
    });

    // Hiển thị nhanh từ cache rồi đồng bộ dữ liệu đầy đủ từ backend
    this._renderUser(app.globalData.userInfo || {});
    this._fetchProfile();
  },

  _fetchProfile() {
    app.request({
      url: "/api/users/me",
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const u = res.data;
          const userInfo = {
            ...u,
            id: u.id || u._id,
            fullName: u.fullName || u.name,
            department:
              u.department && typeof u.department === "object"
                ? u.department.name
                : u.department,
          };
          app.globalData.userInfo = { ...app.globalData.userInfo, ...userInfo };
          this._renderUser(userInfo);
        }
      },
      fail: () => {},
    });
  },

  _renderUser(userInfo) {
    const t = this.data.t;
    let initial = "?";
    if (userInfo.fullName) {
      const parts = userInfo.fullName.trim().split(" ");
      initial = parts[parts.length - 1].charAt(0).toUpperCase();
    }

    const roleMap = {
      ADMIN: t.dashboard.roleAdmin || "Quản trị viên",
      MANAGER: t.dashboard.roleManager || "Quản lý",
      EMPLOYEE: t.dashboard.roleEmployee || "Nhân viên"
    };

    const createdAtFormatted = userInfo.createdAt
      ? new Date(userInfo.createdAt).toLocaleDateString(i18n.getLanguage() === "en" ? "en-US" : "vi-VN")
      : "01/01/2026";

    this.setData({
      user: {
        ...userInfo,
        roleText: roleMap[userInfo.role] || (t.dashboard.roleEmployee || "Nhân viên"),
        createdAt: createdAtFormatted
      },
      initial
    });
  },

  goToFaceReg() {
    tt.navigateTo({ url: "/pages/face-reg/face-reg" });
  },

  goToChangePassword() {
    tt.navigateTo({ url: "/pages/change-password/change-password" });
  },

  goToLeaveBalance() {
    tt.navigateTo({ url: "/pages/leave-balance/leave-balance" });
  },

  goToPayslip() {
    tt.navigateTo({ url: "/pages/payslip/payslip" });
  },

  goToHistory() {
    tt.navigateTo({ url: "/pages/history/history" });
  },

  goToSettings() {
    tt.navigateTo({ url: "/pages/settings/settings" });
  },

  handleLogout() {
    const { t } = this.data;
    tt.showModal({
      title: t.settings.logoutConfirmTitle || "Đăng xuất",
      content: t.settings.logoutConfirmContent || "Bạn có chắc muốn đăng xuất?",
      cancelText: t.common.cancel,
      confirmText: t.common.confirm,
      confirmColor: "#f87171",
      success: (res) => {
        if (res.confirm) {
          app.logout();
        }
      }
    });
  }
});
