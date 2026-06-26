// pages/schedule/schedule.js
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    days: [],
    t: {},
    theme: "light",
    subtitle: "",
    eyebrow: "",
    workCount: 0,
    offCount: 0,
    totalHours: 0,
    labelWork: "",
    labelOff: "",
    labelHours: "",
    selectedDate: "10",
    currentWeekOffset: 0,
    userRole: "employee"
  },

  onShow() {
    const t = i18n.getTranslations();
    const theme = i18n.getTheme();
    const userRole = app.globalData.userRole || "employee";
    this.setData({ t, theme, userRole });
    this.loadWeekSchedule();
  },

  loadWeekSchedule() {
    const isEn = i18n.getLanguage() === "en";
    const offset = this.data.currentWeekOffset;

    // Tính thứ Hai của tuần (this week + offset)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dow = (today.getDay() + 6) % 7; // 0 = Mon ... 6 = Sun
    const monday = new Date(today);
    monday.setDate(today.getDate() - dow + offset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const dayNamesVi = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const dayNamesEn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayNames = isEn ? dayNamesEn : dayNamesVi;
    const pad = (n) => (n < 10 ? "0" + n : "" + n);

    // Khung 7 ngày của tuần
    const baseDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      baseDays.push({
        dateObj: d,
        date: pad(d.getDate()),
        dayName: dayNames[i],
        isToday: d.getTime() === today.getTime(),
      });
    }

    let eyebrow;
    if (offset === 0) eyebrow = isEn ? "This week" : "Tuần này";
    else if (offset === 1) eyebrow = isEn ? "Next week" : "Tuần sau";
    else eyebrow = isEn ? "Previous week" : "Tuần trước";

    const subtitle = `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} - ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}`;

    const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    this.setData({
      eyebrow,
      subtitle,
      labelWork: isEn ? "Work days" : "Ngày làm",
      labelOff: isEn ? "Days off" : "Ngày nghỉ",
      labelHours: isEn ? "Total hrs" : "Tổng giờ"
    });

    tt.setNavigationBarTitle({
      title: this.data.t.schedule.title || "Lịch làm việc"
    });

    app.request({
      url: `/api/shifts/my-schedule?startDate=${toISODate(monday)}&endDate=${toISODate(sunday)}`,
      method: "GET",
      success: (res) => {
        const list = (res.statusCode === 200 && res.data && res.data.data) || [];
        this._renderDays(baseDays, list, isEn);
      },
      fail: () => {
        // Không có dữ liệu -> hiển thị khung tuần với tất cả là ngày nghỉ
        this._renderDays(baseDays, [], isEn);
      },
    });
  },

  _renderDays(baseDays, schedules, isEn) {
    const todayLabel = isEn ? "Today" : "Hôm nay";
    const offLabel = isEn ? "Off" : "Nghỉ";
    const offName = isEn ? "Weekend Off" : "Nghỉ cuối tuần";

    // Map schedule theo ngày (YYYY-M-D)
    const byDate = {};
    schedules.forEach((s) => {
      const sd = new Date(s.date);
      const key = `${sd.getFullYear()}-${sd.getMonth()}-${sd.getDate()}`;
      byDate[key] = s;
    });

    const days = baseDays.map((bd) => {
      const d = bd.dateObj;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const s = byDate[key];
      const isWork = s && s.status !== "off" && (s.shiftId || s.shiftName);

      if (isWork) {
        const shiftName = (s.shiftId && s.shiftId.name) || s.shiftName || (isEn ? "Shift" : "Ca làm");
        const start = (s.shiftId && s.shiftId.startTime) || s.startTime || "08:00";
        const end = (s.shiftId && s.shiftId.endTime) || s.endTime || "17:00";
        return {
          date: bd.date,
          dayName: bd.dayName,
          shiftName,
          time: `${start} - ${end}`,
          location: s.location || (isEn ? "Head Office" : "Văn phòng chính"),
          isToday: bd.isToday,
          isOff: false,
          badge: bd.isToday ? todayLabel : "",
        };
      }
      return {
        date: bd.date,
        dayName: bd.dayName,
        shiftName: offName,
        time: "--",
        location: "--",
        isToday: bd.isToday,
        isOff: true,
        badge: offLabel,
      };
    });

    const workCount = days.filter((d) => !d.isOff).length;
    const offCount = days.length - workCount;
    const totalHours = workCount * 8;
    const progressAngle = Math.round((workCount / (days.length || 7)) * 360);

    this.setData({
      days,
      workCount,
      offCount,
      totalHours,
      progressAngle,
      selectedDate: days[0].date,
    });
  },

  prevWeek() {
    const offset = this.data.currentWeekOffset;
    if (offset > -1) {
      this.setData({ currentWeekOffset: offset - 1 }, () => {
        this.loadWeekSchedule();
      });
    }
  },

  nextWeek() {
    const offset = this.data.currentWeekOffset;
    if (offset < 1) {
      this.setData({ currentWeekOffset: offset + 1 }, () => {
        this.loadWeekSchedule();
      });
    }
  },

  selectDay(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date });
    
    // Smooth scroll to the corresponding card
    tt.createSelectorQuery()
      .select(`#day-${date}`)
      .boundingClientRect()
      .exec((rects) => {
        if (rects && rects[0]) {
          tt.pageScrollTo({
            selector: `#day-${date}`,
            duration: 300,
            offsetTop: -120
          });
        }
      });
  }
});
