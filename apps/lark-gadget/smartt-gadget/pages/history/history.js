// pages/history/history.js — Logic lịch sử chấm công
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    currentMonth: new Date().getMonth() + 1,
    currentYear: new Date().getFullYear(),
    records: [],
    hasRecords: false,
    summary: { onTime: 0, late: 0, absent: 0, total: 0 },
    loading: false,
    t: {},
    theme: "light"
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    const t = i18n.getTranslations();
    this.setData({
      t,
      theme: i18n.getTheme()
    });
    this.loadHistory();

    tt.setNavigationBarTitle({
      title: t.dashboard.history
    });
  },

  // ===== Tải lịch sử chấm công =====
  loadHistory() {
    this.setData({ loading: true });

    const monthNum = this.data.currentMonth;
    const month = String(monthNum).padStart(2, "0");
    const year = String(this.data.currentYear);
    const from = `${year}-${month}-01`;
    const lastDay = new Date(this.data.currentYear, monthNum, 0).getDate();
    const to = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    app.request({
      url: `/api/attendance/history?from=${from}&to=${to}&limit=100`,
      method: "GET",
      success: (res) => {
        this.setData({ loading: false });
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.records)) {
          const rawList = res.data.records;

          const t = this.data.t;
          const statusMap = {
            ontime: { text: t.attendance.onTime || "Đúng giờ", cls: "success" },
            late: { text: t.attendance.late || "Đi muộn", cls: "warning" },
            absent: { text: t.attendance.absent || "Vắng", cls: "danger" },
            overtime: { text: t.requests?.leaveTypes?.overtime || "Tăng ca", cls: "success" },
            weekend: { text: "Cuối tuần", cls: "info" },
            on_leave: { text: t.requests?.leaveTypes?.annual || "Nghỉ phép", cls: "info" }
          };

          const isEn = i18n.getLanguage() === "en";
          const dayMap = {
            "Thứ Hai": "Mon", "Thứ Ba": "Tue", "Thứ Tư": "Wed", "Thứ Năm": "Thu", "Thứ Sáu": "Fri", "Thứ Bảy": "Sat", "Chủ Nhật": "Sun",
            "T2": "Mon", "T3": "Tue", "T4": "Wed", "T5": "Thu", "T6": "Fri", "T7": "Sat", "CN": "Sun"
          };

          const records = rawList.map(item => {
            const s = statusMap[item.status] || { text: item.status, cls: "neutral" };
            let dayOfWeek = item.day || "";
            if (isEn) {
              dayOfWeek = dayMap[dayOfWeek] || dayOfWeek;
            }
            return {
              ...item,
              dayOfWeek,
              statusText: s.text,
              statusClass: s.cls,
              workHours: item.hours || "",
              checkInDisplay: item.checkIn || "--:--",
              checkOutDisplay: item.checkOut || "--:--",
            };
          });

          // Calculate summary locally for month
          const onTimeCount = records.filter(r => r.status === "ontime" || r.status === "overtime").length;
          const lateCount = records.filter(r => r.status === "late").length;
          const absentCount = records.filter(r => r.status === "absent").length;

          this.setData({
            records,
            hasRecords: records.length > 0,
            summary: {
              onTime: onTimeCount,
              late: lateCount,
              absent: absentCount,
              total: records.length
            },
          });
        }
      },
      fail: () => {
        this.setData({ loading: false });
        tt.showToast({ title: this.data.t.common.error || "Lỗi kết nối", icon: "none" });
      },
    });
  },

  prevMonth() {
    let { currentMonth, currentYear } = this.data;
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    this.setData({ currentMonth, currentYear }, () => this.loadHistory());
  },

  nextMonth() {
    let { currentMonth, currentYear } = this.data;
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    this.setData({ currentMonth, currentYear }, () => this.loadHistory());
  },
});
