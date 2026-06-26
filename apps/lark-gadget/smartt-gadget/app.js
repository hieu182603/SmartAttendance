// ============================================================
// app.js — Entry point toàn cục của SmartAttendance Lark Gadget
// ============================================================
const env = require("./env.js");

App({
  globalData: {
    // Cấu hình API Backend
    apiHost: env.apiHost,

    token: null,        // JWT access token (short-lived)
    refreshToken: null, // Refresh token (long-lived, stored securely)
    userInfo: null,     // { id, fullName, email, role, avatarUrl, departmentId }
    userRole: null,     // 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'HR_MANAGER' | 'SUPER_ADMIN' | 'TRIAL'
  },


  // Cờ chống gọi refresh token đồng thời
  _isRefreshing: false,
  _refreshQueue: [],

  onLaunch() {
    // Reset/Default theme to light for the new design version
    try {
      const hasReset = tt.getStorageSync("sa_theme_reset_v2");
      if (!hasReset) {
        tt.setStorageSync("settings_theme", "light");
        tt.setStorageSync("settings_darkMode", "false");
        tt.setStorageSync("sa_theme_reset_v2", "true");
      }
    } catch (e) {}

    // === SECURITY FIX: Xóa mật khẩu plaintext nếu tồn tại từ phiên bản cũ ===
    try {
      tt.removeStorageSync("sa_remember_password");
    } catch (e) {}

    // Khởi động: kiểm tra xem token đã được lưu trong bộ nhớ máy chưa
    try {
      const savedToken = tt.getStorageSync("sa_token");
      const savedRefreshToken = tt.getStorageSync("sa_refresh_token");

      if (savedToken) {
        this.globalData.token = savedToken;
        this.globalData.refreshToken = savedRefreshToken || null;
        // Có token -> chuyển thẳng vào Dashboard (Dashboard sẽ tự verify token)
        tt.reLaunch({ url: "/pages/dashboard/dashboard" });
      } else if (savedRefreshToken) {
        // Access token hết hạn nhưng còn refresh token -> thử refresh
        this.globalData.refreshToken = savedRefreshToken;
        this._doRefreshToken({
          success: () => {
            tt.reLaunch({ url: "/pages/dashboard/dashboard" });
          },
          fail: () => {
            this._clearTokens();
            tt.reLaunch({ url: "/pages/login/login" });
          },
        });
      } else {
        // Chưa đăng nhập -> vào màn Đăng nhập
        tt.reLaunch({ url: "/pages/login/login" });
      }
    } catch (e) {
      // Lỗi đọc storage -> vào màn Đăng nhập
      tt.reLaunch({ url: "/pages/login/login" });
    }
  },

  // ================================================================
  // Lưu token sau khi đăng nhập thành công
  // Được gọi từ login.js khi nhận response từ /api/auth/login
  // ================================================================
  saveTokens(token, refreshToken) {
    this.globalData.token = token;
    this.globalData.refreshToken = refreshToken || null;
    try {
      tt.setStorageSync("sa_token", token);
      if (refreshToken) {
        tt.setStorageSync("sa_refresh_token", refreshToken);
      }
    } catch (e) {
      console.error("[App] Lỗi lưu token:", e);
    }
  },

  // ================================================================
  // Xóa toàn bộ token khỏi memory + storage
  // ================================================================
  _clearTokens() {
    this.globalData.token = null;
    this.globalData.refreshToken = null;
    this.globalData.userInfo = null;
    this.globalData.userRole = null;
    try {
      tt.removeStorageSync("sa_token");
      tt.removeStorageSync("sa_refresh_token");
    } catch (e) {}
  },

  // ================================================================
  // Đăng xuất: Gọi server revoke refresh token + xóa local
  // ================================================================
  logout() {
    const token = this.globalData.token;

    // Xóa local trước để UI phản hồi nhanh
    this._clearTokens();

    // Gọi server-side logout để thu hồi refresh token (fire-and-forget)
    if (token) {
      tt.request({
        url: `${this.globalData.apiHost}/api/auth/logout`,
        method: "POST",
        header: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        success: () => {},
        fail: () => {},
      });
    }

    tt.reLaunch({ url: "/pages/login/login" });
  },

  // ================================================================
  // Refresh token: Đổi access token mới từ refresh token
  // ================================================================
  _doRefreshToken(callbacks) {
    const refreshToken = this.globalData.refreshToken;
    if (!refreshToken) {
      if (callbacks && callbacks.fail) callbacks.fail();
      return;
    }

    tt.request({
      url: `${this.globalData.apiHost}/api/auth/refresh`,
      method: "POST",
      data: { refreshToken: refreshToken },
      header: { "Content-Type": "application/json" },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.token) {
          // Lưu token mới (refresh token cũng được rotate)
          this.saveTokens(res.data.token, res.data.refreshToken);
          if (callbacks && callbacks.success) callbacks.success(res.data.token);
        } else {
          // Refresh token hết hạn hoặc bị revoke
          this._clearTokens();
          if (callbacks && callbacks.fail) callbacks.fail();
        }
      },
      fail: () => {
        if (callbacks && callbacks.fail) callbacks.fail();
      },
    });
  },

  // ================================================================
  // Hàm tiện ích: Gọi API với auto-refresh token khi 401
  // ================================================================
  request(options) {
    const { url, method = "GET", data, header = {}, success, fail } = options;

    const makeRequest = (accessToken) => {
      tt.request({
        url: `${this.globalData.apiHost}${url}`,
        method,
        data,
        header: {
          "Content-Type": "application/json",
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
          ...header,
        },
        success: (res) => {
          // Token hết hạn (401) -> thử refresh token
          if (res.statusCode === 401) {
            this._handleTokenExpired(options);
            return;
          }
          if (success) success(res);
        },
        fail: (err) => {
          if (fail) fail(err);
        },
      });
    };

    makeRequest(this.globalData.token);
  },

  // ================================================================
  // Xử lý khi access token hết hạn (401)
  // Sử dụng queue để tránh gọi refresh token nhiều lần đồng thời
  // ================================================================
  _handleTokenExpired(originalRequest) {
    // Nếu không có refresh token -> đăng xuất ngay
    if (!this.globalData.refreshToken) {
      tt.showToast({ title: "Phiên đăng nhập hết hạn", icon: "none" });
      this.logout();
      return;
    }

    // Thêm request gốc vào hàng đợi
    this._refreshQueue.push(originalRequest);

    // Nếu đang refresh rồi thì chờ -> request sẽ được replay khi refresh xong
    if (this._isRefreshing) {
      return;
    }

    // Bắt đầu refresh
    this._isRefreshing = true;

    this._doRefreshToken({
      success: (newToken) => {
        this._isRefreshing = false;
        // Replay tất cả request đang chờ với token mới
        const queue = this._refreshQueue.splice(0);
        queue.forEach((req) => {
          this.request(req);
        });
      },
      fail: () => {
        this._isRefreshing = false;
        this._refreshQueue = [];
        tt.showToast({ title: "Phiên đăng nhập hết hạn", icon: "none" });
        this.logout();
      },
    });
  },
});
