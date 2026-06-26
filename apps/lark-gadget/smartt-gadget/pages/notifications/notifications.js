// pages/notifications/notifications.js
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    notifications: [],
    hasUnread: false,
    t: {},
    theme: "light"
  },

  onShow() {
    const t = i18n.getTranslations();
    const theme = i18n.getTheme();

    this.setData({ t, theme });

    tt.setNavigationBarTitle({
      title: t.notifications.title
    });

    this.loadNotifications();
  },

  loadNotifications() {
    app.request({
      url: "/api/notifications?limit=20",
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const raw = res.data.notifications || [];
          const lang = i18n.getLanguage();
          const notifications = raw.map((n) => ({
            id: n.id || n._id,
            title: n.title,
            body: n.message,
            time: this._timeAgo(n.createdAt, lang),
            unread: !n.isRead,
          }));
          const hasUnread = notifications.some((item) => item.unread);
          this.setData({ notifications, hasUnread });
        }
      },
      fail: () => {
        tt.showToast({ title: this.data.t.common.error || "Lỗi kết nối", icon: "none" });
      },
    });
  },

  _timeAgo(dateStr, lang) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const isEn = lang === "en";
    if (mins < 1) return isEn ? "Just now" : "Vừa xong";
    if (mins < 60) return isEn ? `${mins} mins ago` : `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return isEn ? `${hours} hours ago` : `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return isEn ? `${days} days ago` : `${days} ngày trước`;
  },

  markAsRead(e) {
    const id = e.currentTarget.dataset.id;
    const target = this.data.notifications.find((item) => item.id === id);
    if (!target || !target.unread) return;

    app.request({
      url: `/api/notifications/${id}/read`,
      method: "PUT",
      success: (res) => {
        if (res.statusCode === 200) {
          const notifications = this.data.notifications.map((item) =>
            item.id === id ? { ...item, unread: false } : item
          );
          const hasUnread = notifications.some((item) => item.unread);
          this.setData({ notifications, hasUnread });
          tt.showToast({
            title: this.data.t.notifications.readToast || "Đã đọc",
            icon: "success"
          });
        }
      },
      fail: () => {
        tt.showToast({ title: this.data.t.common.error || "Lỗi kết nối", icon: "none" });
      },
    });
  },

  markAllAsRead() {
    if (!this.data.hasUnread) return;

    app.request({
      url: "/api/notifications/read-all",
      method: "PUT",
      success: (res) => {
        if (res.statusCode === 200) {
          const notifications = this.data.notifications.map((item) => ({
            ...item,
            unread: false
          }));
          this.setData({ notifications, hasUnread: false });
          tt.showToast({
            title: this.data.t.notifications.readAllToast || "Đã đọc tất cả",
            icon: "success"
          });
        }
      },
      fail: () => {
        tt.showToast({ title: this.data.t.common.error || "Lỗi kết nối", icon: "none" });
      },
    });
  }
});
