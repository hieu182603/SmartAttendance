// pages/index/index.js — Splash: kiểm tra phiên rồi điều hướng (căn theo mobile SplashScreen)
const app = getApp();

Page({
  data: {},

  onLoad() {
    this._timer = setTimeout(() => {
      const target = (app && app.globalData && app.globalData.token)
        ? "/pages/dashboard/dashboard"
        : "/pages/login/login";
      tt.reLaunch({
        url: target,
        fail(err) {
          console.error("Splash redirect failed:", err);
        }
      });
    }, 2600);
  },

  onUnload() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }
});
