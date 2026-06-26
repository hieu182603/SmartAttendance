// pages/forgot-pw/forgot-pw.js — Controller xử lý khôi phục mật khẩu từng bước
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    step: 1, // 1: Email, 2: OTP, 3: Reset Password, 4: Success
    email: "",
    maskedEmail: "",
    otp: "",
    password: "",
    confirm: "",
    showPw: false,
    showConfirm: false,
    loading: false,
    errorMsg: "",
    resetToken: "",
    countdown: 299,
    countdownStr: "05:00",
    canResend: false,
    ruleLength: false,
    ruleUpper: false,
    ruleNumber: false,
    t: {},
    theme: "light"
  },

  timerId: null,

  onLoad() {
    // Nếu có token rồi thì chuyển thẳng vào Dashboard
    if (app.globalData.token) {
      tt.reLaunch({ url: "/pages/dashboard/dashboard" });
    }
  },

  onShow() {
    const t = i18n.getTranslations();
    this.setData({
      t,
      theme: i18n.getTheme(),
      language: i18n.getLanguage()
    });
    tt.setNavigationBarTitle({
      title: t.forgotPw.title
    });
  },

  onUnload() {
    this.clearTimer();
  },

  goBack() {
    const { step } = this.data;
    if (step === 1) {
      tt.navigateBack();
    } else if (step === 4) {
      tt.reLaunch({ url: "/pages/login/login" });
    } else {
      // Quay lại bước trước đó và reset trạng thái của bước hiện tại
      if (step === 2) {
        this.clearTimer();
      }
      this.setData({
        step: step - 1,
        errorMsg: "",
        otp: "",
        password: "",
        confirm: "",
        ruleLength: false,
        ruleUpper: false,
        ruleNumber: false,
      });
    }
  },

  goToStep1() {
    this.clearTimer();
    this.setData({
      step: 1,
      otp: "",
      errorMsg: "",
    });
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value, errorMsg: "" });
  },

  onOtpInput(e) {
    this.setData({ otp: e.detail.value, errorMsg: "" });
  },

  onPasswordInput(e) {
    const pw = e.detail.value;
    const ruleLength = pw.length >= 8;
    const ruleUpper = /[A-Z]/.test(pw);
    const ruleNumber = /\d/.test(pw);
    this.setData({
      password: pw,
      ruleLength,
      ruleUpper,
      ruleNumber,
      errorMsg: "",
    });
  },

  onConfirmInput(e) {
    this.setData({ confirm: e.detail.value, errorMsg: "" });
  },

  toggleShowPw() {
    this.setData({ showPw: !this.data.showPw });
  },

  toggleShowConfirm() {
    this.setData({ showConfirm: !this.data.showConfirm });
  },

  maskEmail(email) {
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const [local, domain] = parts;
    if (local.length <= 2) {
      return local + "***" + "@" + domain;
    }
    return local[0] + "***" + local[local.length - 1] + "@" + domain;
  },

  startTimer() {
    this.clearTimer();
    this.setData({
      countdown: 299,
      countdownStr: "05:00",
      canResend: false,
    });

    this.timerId = setInterval(() => {
      let { countdown } = this.data;
      if (countdown <= 1) {
        this.clearTimer();
        this.setData({
          countdown: 0,
          countdownStr: "00:00",
          canResend: true,
        });
      } else {
        countdown--;
        const m = Math.floor(countdown / 60).toString().padStart(2, "0");
        const s = (countdown % 60).toString().padStart(2, "0");
        this.setData({
          countdown,
          countdownStr: `${m}:${s}`,
        });
      }
    }, 1000);
  },

  clearTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  },

  sendOtp() {
    const { email, t } = this.data;
    if (!email.trim()) {
      this.setData({ errorMsg: this.data.language === "en" ? "Please enter your email." : "Vui lòng nhập email." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      this.setData({ errorMsg: this.data.language === "en" ? "Invalid email format." : "Email không đúng định dạng." });
      return;
    }

    this.setData({ loading: true, errorMsg: "" });

    tt.request({
      url: `${app.globalData.apiHost}/api/auth/forgot-password`,
      method: "POST",
      data: { email: email.trim() },
      header: { "Content-Type": "application/json" },
      success: (res) => {
        this.setData({ loading: false });
        if (res.statusCode === 200) {
          const masked = this.maskEmail(email.trim());
          this.setData({
            step: 2,
            maskedEmail: masked,
          });
          this.startTimer();
          tt.showToast({ title: t.forgotPw.btnSend + " " + (this.data.language === "en" ? "Sent!" : "Đã gửi!"), icon: "success" });
        } else {
          this.setData({
            errorMsg: res.data?.message || (this.data.language === "en" ? "Failed to send OTP. Try again." : "Không thể gửi OTP. Vui lòng thử lại."),
          });
        }
      },
      fail: () => {
        this.setData({
          loading: false,
          errorMsg: this.data.language === "en" ? "Network error. Try again." : "Lỗi kết nối mạng. Vui lòng thử lại sau.",
        });
      },
    });
  },

  resendOtp() {
    if (!this.data.canResend) return;

    this.setData({ loading: true, errorMsg: "" });

    tt.request({
      url: `${app.globalData.apiHost}/api/auth/forgot-password`,
      method: "POST",
      data: { email: this.data.email.trim() },
      header: { "Content-Type": "application/json" },
      success: (res) => {
        this.setData({ loading: false });
        if (res.statusCode === 200) {
          this.startTimer();
          tt.showToast({ title: this.data.language === "en" ? "OTP Resent!" : "Đã gửi lại OTP!", icon: "success" });
        } else {
          this.setData({
            errorMsg: res.data?.message || (this.data.language === "en" ? "Failed to send OTP. Try again." : "Không thể gửi OTP. Vui lòng thử lại."),
          });
        }
      },
      fail: () => {
        this.setData({
          loading: false,
          errorMsg: this.data.language === "en" ? "Network error. Try again." : "Lỗi kết nối mạng. Vui lòng thử lại sau.",
        });
      },
    });
  },

  verifyOtp() {
    const { email, otp } = this.data;
    if (!otp || otp.trim().length !== 6) {
      this.setData({ errorMsg: this.data.language === "en" ? "Please enter 6-digit OTP code." : "Vui lòng nhập đủ mã OTP 6 chữ số." });
      return;
    }

    this.setData({ loading: true, errorMsg: "" });

    tt.request({
      url: `${app.globalData.apiHost}/api/auth/verify-reset-otp`,
      method: "POST",
      data: { email: email.trim(), otp: otp.trim() },
      header: { "Content-Type": "application/json" },
      success: (res) => {
        this.setData({ loading: false });
        if (res.statusCode === 200 && res.data.resetToken) {
          this.clearTimer();
          this.setData({
            step: 3,
            resetToken: res.data.resetToken,
          });
        } else {
          this.setData({
            errorMsg: res.data?.message || (this.data.language === "en" ? "Invalid or expired OTP." : "Mã OTP không đúng hoặc đã hết hạn."),
          });
        }
      },
      fail: () => {
        this.setData({
          loading: false,
          errorMsg: this.data.language === "en" ? "Network error. Try again." : "Lỗi kết nối mạng. Vui lòng thử lại sau.",
        });
      },
    });
  },

  resetPassword() {
    const { email, password, confirm, resetToken, ruleLength, ruleUpper, ruleNumber } = this.data;

    if (!ruleLength || !ruleUpper || !ruleNumber) {
      this.setData({ errorMsg: this.data.language === "en" ? "Please meet all password requirements." : "Vui lòng đáp ứng đầy đủ các quy tắc mật khẩu." });
      return;
    }

    if (password !== confirm) {
      this.setData({ errorMsg: this.data.language === "en" ? "Confirm password does not match." : "Xác nhận mật khẩu không trùng khớp." });
      return;
    }

    this.setData({ loading: true, errorMsg: "" });

    tt.request({
      url: `${app.globalData.apiHost}/api/auth/reset-password`,
      method: "POST",
      data: {
        email: email.trim(),
        password: password.trim(),
        resetToken: resetToken,
      },
      header: { "Content-Type": "application/json" },
      success: (res) => {
        this.setData({ loading: false });
        if (res.statusCode === 200) {
          this.setData({
            step: 4,
          });
        } else {
          this.setData({
            errorMsg: res.data?.message || (this.data.language === "en" ? "Reset failed. Try again." : "Đổi mật khẩu thất bại. Vui lòng thực hiện lại."),
          });
        }
      },
      fail: () => {
        this.setData({
          loading: false,
          errorMsg: this.data.language === "en" ? "Network error. Try again." : "Lỗi kết nối mạng. Vui lòng thử lại sau.",
        });
      },
    });
  },

  goToLogin() {
    tt.reLaunch({
      url: "/pages/login/login",
    });
  },
});
