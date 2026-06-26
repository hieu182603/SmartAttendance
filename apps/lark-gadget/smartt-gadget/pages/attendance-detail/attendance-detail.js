// pages/attendance-detail/attendance-detail.js
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    record: {},
    t: {},
    theme: "light",
    withinText: "",
    recordId: ""
  },

  onLoad(options) {
    if (options.recordId) {
      this.setData({ recordId: options.recordId });
    }
  },

  onShow() {
    const t = i18n.getTranslations();
    const theme = i18n.getTheme();
    const isEn = i18n.getLanguage() === "en";
    this.setData({
      t,
      theme,
      withinText: isEn ? "Within geofence" : "Trong phạm vi cho phép"
    });

    tt.setNavigationBarTitle({
      title: t.attendanceDetail.title
    });

    this.loadRecord();
  },

  loadRecord() {
    const id = this.data.recordId;
    if (!id) return;

    app.request({
      url: "/api/attendance/history?limit=100",
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const list = res.data.records || [];
          const doc = list.find((item) => (item.id || item._id) === id);
          if (doc) this._render(doc);
        }
      },
      fail: () => {
        tt.showToast({ title: this.data.t.common.error || "Lỗi kết nối", icon: "none" });
      },
    });
  },

  _render(doc) {
    const t = this.data.t;
    const statusMap = {
      present: { text: t.attendance.onTime || "Đúng giờ", cls: "success" },
      on_time: { text: t.attendance.onTime || "Đúng giờ", cls: "success" },
      overtime: { text: t.dashboard.overtime || "Tăng ca", cls: "success" },
      late: { text: t.attendance.late || "Đi muộn", cls: "warning" },
      absent: { text: t.attendance.absent || "Vắng", cls: "danger" },
      on_leave: { text: t.attendance.onLeave || "Nghỉ phép", cls: "neutral" },
    };
    const st = statusMap[doc.status] || { text: doc.status, cls: "neutral" };

    const lat = doc.checkInLatitude;
    const lng = doc.checkInLongitude;

    const record = {
      date: doc.date,
      statusText: st.text,
      statusClass: st.cls,
      checkIn: doc.checkIn,
      checkOut: doc.checkOut,
      worked: doc.hours,
      location: doc.location || "",
      hasGps: lat != null && lng != null,
      lat: lat != null ? Number(lat).toFixed(4) : "",
      lng: lng != null ? Number(lng).toFixed(4) : "",
    };

    this.setData({ record });
  },

  goBack() {
    tt.navigateBack();
  }
});
