// pages/login/login.js — Logic đăng nhập SmartAttendance
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    email: "",
    password: "",
    showPw: false,
    loading: false,
    errorMsg: "",
    t: {},
    theme: "light",
    rememberMe: false,
  },

  toggleShowPw() {
    this.setData({ showPw: !this.data.showPw });
  },

  toggleRememberMe() {
    this.setData({ rememberMe: !this.data.rememberMe });
  },

  goToForgotPw() {
    tt.navigateTo({
      url: "/pages/forgot-pw/forgot-pw",
    });
  },

  onShow() {
    this.setData({
      t: i18n.getTranslations(),
      theme: i18n.getTheme(),
    });
  },

  onLoad() {
    // Nếu có token rồi thì không hiển thị trang này
    if (app.globalData.token) {
      tt.reLaunch({ url: "/pages/dashboard/dashboard" });
      return;
    }

    // === SECURITY FIX: Xóa mật khẩu plaintext từ phiên bản cũ (nếu có) ===
    try {
      tt.removeStorageSync("sa_remember_password");
    } catch (e) {}

    // Chỉ ghi nhớ email (KHÔNG ghi nhớ mật khẩu)
    try {
      const savedEmail = tt.getStorageSync("sa_remember_email");
      const rememberMe = tt.getStorageSync("sa_remember_me");
      if (rememberMe && savedEmail) {
        this.setData({
          email: savedEmail,
          rememberMe: true,
        });
      }
    } catch (e) {}
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value, errorMsg: "" });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value, errorMsg: "" });
  },

  handleLogin() {
    const { email, password } = this.data;

    // Validation
    if (!email.trim() || !password.trim()) {
      this.setData({ errorMsg: "Vui lòng nhập đầy đủ email và mật khẩu." });
      return;
    }

    this.setData({ loading: true, errorMsg: "" });

    // Gọi API đăng nhập
    // POST /api/auth/login
    // Body: { email, password }
    // Response 200: { token, refreshToken, user: { id, fullName, email, role, avatarUrl } }
    tt.request({
      url: `${app.globalData.apiHost}/api/auth/login`,
      method: "POST",
      data: { email: email.trim(), password: password.trim() },
      header: { "Content-Type": "application/json" },
      success: (res) => {
        this.setData({ loading: false });

        if (res.statusCode === 200 && res.data.token) {
          const { token, refreshToken, user } = res.data;

          // Lưu cặp token (access + refresh) qua app helper
          app.saveTokens(token, refreshToken);

          // Cập nhật global state
          app.globalData.userInfo = user;
          app.globalData.userRole = user.role;

          // Ghi nhớ EMAIL (chỉ email, KHÔNG lưu mật khẩu)
          try {
            if (this.data.rememberMe) {
              tt.setStorageSync("sa_remember_email", email.trim());
              tt.setStorageSync("sa_remember_me", true);
            } else {
              tt.removeStorageSync("sa_remember_email");
              tt.setStorageSync("sa_remember_me", false);
            }
          } catch (e) {}

          tt.showToast({ title: "Đăng nhập thành công! 🎉", icon: "success" });

          // Chuyển sang Dashboard
          setTimeout(() => {
            tt.reLaunch({ url: "/pages/dashboard/dashboard" });
          }, 500);
        } else {
          // Lỗi từ server (sai mật khẩu, tài khoản bị khóa, v.v.)
          const msg =
            res.data?.message ||
            res.data?.error ||
            "Email hoặc mật khẩu không đúng.";
          this.setData({ errorMsg: msg });
        }
      },
      fail: () => {
        this.setData({ loading: false, errorMsg: "Không kết nối được máy chủ. Kiểm tra lại mạng." });
      },
    });
  },
});
