// pages/change-password/change-password.js
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showCurrent: false,
    showNew: false,
    showConfirm: false,
    ruleLengthOk: false,
    ruleMatchOk: false,
    formValid: false,
    loading: false,
    theme: "light",
    t: {}
  },

  onShow() {
    const theme = i18n.getTheme();
    const t = i18n.getTranslations();
    this.setData({ t, theme });

    tt.setNavigationBarTitle({
      title: t.changePw?.title || "Đổi mật khẩu"
    });
  },

  toggleShowCurrent() {
    this.setData({ showCurrent: !this.data.showCurrent });
  },

  toggleShowNew() {
    this.setData({ showNew: !this.data.showNew });
  },

  toggleShowConfirm() {
    this.setData({ showConfirm: !this.data.showConfirm });
  },

  onCurrentPasswordInput(e) {
    this.setData({ currentPassword: e.detail.value }, () => this.validateForm());
  },

  onNewPasswordInput(e) {
    this.setData({ newPassword: e.detail.value }, () => this.validateForm());
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value }, () => this.validateForm());
  },

  validateForm() {
    const { currentPassword, newPassword, confirmPassword } = this.data;
    
    const ruleLengthOk = newPassword.length >= 6;
    const ruleMatchOk = newPassword !== "" && newPassword === confirmPassword;
    const formValid = currentPassword.trim() !== "" && ruleLengthOk && ruleMatchOk;

    this.setData({
      ruleLengthOk,
      ruleMatchOk,
      formValid
    });
  },

  handleSubmit() {
    if (!this.data.formValid || this.data.loading) return;

    this.setData({ loading: true });

    const { t } = this.data;

    app.request({
      url: "/api/users/change-password",
      method: "POST",
      data: {
        currentPassword: this.data.currentPassword,
        newPassword: this.data.newPassword
      },
      success: (res) => {
        this.setData({ loading: false });
        if (res.statusCode === 200) {
          tt.showModal({
            title: t.changePw?.successTitle || "Thành công",
            content: t.changePw?.successMsg || "Đổi mật khẩu thành công! Vui lòng đăng nhập lại bằng mật khẩu mới.",
            showCancel: false,
            confirmText: t.changePw?.successBtn || "Đăng nhập lại",
            confirmColor: "#6366F1",
            success: () => {
              app.logout();
            }
          });
        } else {
          const errMsg = res.data?.message || (t.changePw?.errorFail || "Đổi mật khẩu thất bại");
          tt.showToast({
            title: errMsg,
            icon: "none"
          });
        }
      },
      fail: () => {
        this.setData({ loading: false });
        tt.showToast({
          title: t.changePw?.errorConn || "Lỗi kết nối máy chủ",
          icon: "none"
        });
      }
    });
  }
});
