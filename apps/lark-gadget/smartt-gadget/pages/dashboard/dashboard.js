// pages/dashboard/dashboard.js
const app = getApp();
const i18n = require("../../utils/i18n.js");

function fmtDuration(ms) {
  if (ms <= 0) return "0h 0m";
  const tot = Math.floor(ms / 60000);
  const h = Math.floor(tot / 60);
  const m = tot % 60;
  return `${h}h ${m}m`;
}

Page({
  data: {
    userInfo: null,
    userRole: null,
    roleText: "",
    roleBadgeClass: "employee",   // 'employee' | 'manager' | 'admin'
    nameInitial: "?",
    displayName: "Đang tải...",
    isManagerOrAdmin: false,

    // Today status matching React Native hero
    shiftStart: "08:00",
    shiftEnd: "17:00",
    isCheckedIn: false,
    checkInTimeStr: "--:--",
    workedStr: "--",
    remainingStr: "--",
    clockStr: "--:--",
    dateStr: "",

    todayData: {
      checkIn: "",
      checkOut: "",
      statusText: "Chưa chấm",
      statusClass: "neutral",
    },

    teamStats: { present: 0, late: 0, absent: 0 },
    pendingCount: 0,
    unreadNotifCount: 0,
    recentActivities: [],
    attendanceThisMonth: 0,
    workedHoursThisMonth: 0,
    monthlyActiveDaysPercent: 0,
    monthlyWorkedHoursPercent: 0,
    monthLabel: "",
  },

  timerId: null,

  onShow() {
    const t = i18n.getTranslations();
    const theme = i18n.getTheme();
    this.setData({ t, theme });
    this.verifyAndLoad();
    this.startClock();
  },

  onHide() {
    this.stopClock();
  },

  onUnload() {
    this.stopClock();
  },

  startClock() {
    this.stopClock();
    this.updateClock();
    this.timerId = setInterval(() => {
      this.updateClock();
    }, 30000);
  },

  stopClock() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  },

  updateClock() {
    const now = new Date();
    const DAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const clockStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = `${DAYS_VI[now.getDay()]}, ${now.getDate()} tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
    
    this.setData({ clockStr, dateStr });
    this.computeWorkedTimes();
  },

  computeWorkedTimes() {
    const { todayData, shiftEnd } = this.data;
    if (!todayData || !todayData.checkIn || todayData.checkIn === "--:--" || todayData.checkIn === "") {
      this.setData({
        isCheckedIn: false,
        checkInTimeStr: "--:--",
        workedStr: "--",
        remainingStr: "--",
      });
      return;
    }

    try {
      const now = new Date();
      let checkInDate;
      if (todayData.checkIn.indexOf("T") !== -1 || todayData.checkIn.indexOf("-") !== -1) {
        checkInDate = new Date(todayData.checkIn);
      } else {
        const [h, m] = todayData.checkIn.split(":");
        checkInDate = new Date();
        checkInDate.setHours(parseInt(h), parseInt(m), 0, 0);
      }

      const isCheckedIn = !!todayData.checkIn && (!todayData.checkOut || todayData.checkOut === "--:--" || todayData.checkOut === "");

      const checkInTimeStr = `${String(checkInDate.getHours()).padStart(2, '0')}:${String(checkInDate.getMinutes()).padStart(2, '0')}`;
      
      let workedStr = "--";
      let remainingStr = "--";

      if (isCheckedIn) {
        workedStr = fmtDuration(Math.max(0, now.getTime() - checkInDate.getTime()));
        
        const [hEnd, mEnd] = shiftEnd.split(':').map(Number);
        const endOfShift = new Date(now);
        endOfShift.setHours(hEnd, mEnd, 0, 0);
        remainingStr = fmtDuration(Math.max(0, endOfShift.getTime() - now.getTime()));
      } else {
        let checkOutDate;
        if (todayData.checkOut.indexOf("T") !== -1 || todayData.checkOut.indexOf("-") !== -1) {
          checkOutDate = new Date(todayData.checkOut);
        } else {
          const [h, m] = todayData.checkOut.split(":");
          checkOutDate = new Date();
          checkOutDate.setHours(parseInt(h), parseInt(m), 0, 0);
        }
        workedStr = fmtDuration(Math.max(0, checkOutDate.getTime() - checkInDate.getTime()));
        remainingStr = "0h 0m";
      }

      this.setData({
        isCheckedIn,
        checkInTimeStr,
        workedStr,
        remainingStr,
      });
    } catch (e) {
      console.error("Error computing worked times: ", e);
    }
  },

  // API: GET /api/auth/me
  verifyAndLoad() {
    const token = app.globalData.token;
    if (!token) {
      tt.reLaunch({ url: "/pages/login/login" });
      return;
    }

    tt.showNavigationBarLoading();

    tt.request({
      url: `${app.globalData.apiHost}/api/auth/me`,
      method: "GET",
      header: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      success: (res) => {
        tt.hideNavigationBarLoading();

        const user = res.data.user || res.data;
        if (res.statusCode === 200 && user && (user.id || user._id)) {
          app.globalData.userInfo = user;
          app.globalData.userRole = user.role;

          let initial = "?";
          if (user.fullName) {
            const parts = user.fullName.trim().split(" ");
            initial = parts[parts.length - 1].charAt(0).toUpperCase();
          }

          const t = i18n.getTranslations();
          const roleMap = {
            ADMIN: t.dashboard.roleAdmin || "Quản trị viên",
            MANAGER: t.dashboard.roleManager || "Quản lý",
            EMPLOYEE: t.dashboard.roleEmployee || "Nhân viên",
          };
          const badgeMap = {
            ADMIN: "admin",
            MANAGER: "manager",
            EMPLOYEE: "employee",
          };

          this.setData({
            userInfo: user,
            userRole: user.role,
            roleText: roleMap[user.role] || (t.dashboard.roleEmployee || "Nhân viên"),
            roleBadgeClass: badgeMap[user.role] || "employee",
            nameInitial: initial,
            displayName: user.fullName || "Người dùng",
            isManagerOrAdmin: user.role === "MANAGER" || user.role === "ADMIN",
          });

          this.loadTodayAttendance();
          this.loadUnreadNotifications();
          this.loadMonthlyStats();
          if (user.role === "MANAGER" || user.role === "ADMIN") {
            this.loadManagerData();
          }
        } else if (res.statusCode === 401) {
          app.logout();
        }
      },
      fail: () => {
        tt.hideNavigationBarLoading();
        tt.showToast({ title: "Lỗi kết nối máy chủ", icon: "none" });
      },
    });
  },

  // API: GET /api/attendance/recent?limit=3
  loadTodayAttendance() {
    tt.request({
      url: app.globalData.apiHost + "/api/attendance/recent?limit=3",
      method: "GET",
      header: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + app.globalData.token,
      },
      success: (res) => {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          const d = res.data[0];
          const t = i18n.getTranslations();
          const statusMap = {
            ontime: { text: t.dashboard.onTime || "Đúng giờ", cls: "success" },
            present: { text: t.dashboard.onTime || "Đúng giờ", cls: "success" },
            late: { text: t.dashboard.late || "Đi muộn", cls: "warning" },
            absent: { text: t.dashboard.absent || "Vắng mặt", cls: "danger" },
            half_day: { text: t.dashboard.halfDay || "Nửa ngày", cls: "info" },
          };
          const s = statusMap[d.status] || { text: t.dashboard.notWorking || "Chưa chấm", cls: "neutral" };

          const recentActivities = res.data.slice(0, 3).map((item) => {
            const hasCheckOut = !!item.checkOut && item.checkOut !== "-";
            const isLate = item.status === "late";
            
            let timeStr = "--:--";
            const targetTime = hasCheckOut ? item.checkOut : item.checkIn;
            if (targetTime && targetTime !== "-") {
              try {
                if (targetTime.includes("T") || targetTime.includes("-")) {
                  const dateObj = new Date(targetTime);
                  if (!isNaN(dateObj.getTime())) {
                    timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                  }
                } else {
                  timeStr = targetTime.slice(0, 5);
                }
              } catch (e) {
                timeStr = String(targetTime).slice(0, 5);
              }
            }

            return {
              id: item.id || item._id || String(Math.random()),
              type: hasCheckOut ? "checkout" : "checkin",
              iconType: isLate ? "orange" : (hasCheckOut ? "green" : "blue"),
              title: hasCheckOut ? "Check-out thành công" : "Check-in thành công",
              sub: item.location || item.locationName || "Văn phòng",
              time: timeStr,
              badge: isLate ? { label: "Đi muộn", color: "orange" } : null,
            };
          });

          this.setData({
            todayData: {
              checkIn: d.checkIn || "",
              checkOut: d.checkOut || "",
              statusText: s.text,
              statusClass: s.cls,
            },
            recentActivities,
          }, () => {
            this.computeWorkedTimes();
          });
        } else {
          const t = i18n.getTranslations();
          this.setData({
            todayData: {
              checkIn: "",
              checkOut: "",
              statusText: t.dashboard.notWorking || "Chưa chấm",
              statusClass: "neutral",
            },
            recentActivities: [],
          }, () => {
            this.computeWorkedTimes();
          });
        }
      },
      fail: () => {},
    });
  },

  loadUnreadNotifications() {
    tt.request({
      url: app.globalData.apiHost + "/api/notifications/unread-count",
      method: "GET",
      header: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + app.globalData.token,
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && typeof res.data.count === "number") {
          this.setData({
            unreadNotifCount: res.data.count,
          });
        }
      },
      fail: () => {},
    });
  },

  loadMonthlyStats() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDayDate = new Date(year, month + 1, 0);
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
    const totalDaysInMonth = lastDayDate.getDate();

    const monthLabel = `Tháng ${month + 1} / ${year}`;
    this.setData({ monthLabel });

    tt.request({
      url: `${app.globalData.apiHost}/api/attendance/history?from=${firstDay}&to=${lastDay}&limit=50`,
      method: "GET",
      header: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + app.globalData.token,
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.records)) {
          const records = res.data.records;
          
          const attendanceThisMonth = records.filter(r => 
            ["present", "ontime", "late", "overtime"].includes(r.status)
          ).length;

          let workedHoursThisMonth = 0;
          records.forEach(r => {
            if (r.hours && r.hours !== "-") {
              const num = parseFloat(r.hours);
              if (!isNaN(num)) {
                workedHoursThisMonth += num;
              }
            }
          });

          workedHoursThisMonth = Math.round(workedHoursThisMonth);

          const monthlyActiveDaysPercent = Math.min(100, Math.round((attendanceThisMonth / totalDaysInMonth) * 100));
          const monthlyWorkedHoursPercent = Math.min(100, Math.round((workedHoursThisMonth / (totalDaysInMonth * 8)) * 100));

          this.setData({
            attendanceThisMonth,
            workedHoursThisMonth,
            monthlyActiveDaysPercent,
            monthlyWorkedHoursPercent
          });
        }
      },
      fail: () => {},
    });
  },

  // API: GET /api/dashboard/stats
  loadManagerData() {
    app.request({
      url: "/api/dashboard/stats",
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.kpi) {
          const kpi = res.data.kpi;
          this.setData({
            teamStats: {
              present: kpi.presentToday || 0,
              late: kpi.lateToday || 0,
              absent: kpi.absentToday || 0,
            }
          });
        }
      }
    });

    app.request({
      url: "/api/requests?status=pending&limit=1",
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.pagination) {
          this.setData({
            pendingCount: res.data.pagination.total || 0
          });
        }
      }
    });
  },

  goToAttendance() { tt.navigateTo({ url: "/pages/attendance/attendance" }); },
  goToHistory() { tt.navigateTo({ url: "/pages/history/history" }); },
  goToFaceReg() { tt.navigateTo({ url: "/pages/face-reg/face-reg" }); },
  goToApprovals() { tt.navigateTo({ url: "/pages/manager/approvals" }); },
  goToTeamStatus() { tt.navigateTo({ url: "/pages/manager/team-status" }); },
  goToSchedule() { tt.navigateTo({ url: "/pages/schedule/schedule" }); },
  goToRequests(e) {
    const type = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.type;
    if (type) {
      tt.navigateTo({ url: `/pages/requests/requests?type=${type}` });
    } else {
      tt.navigateTo({ url: "/pages/requests/requests" });
    }
  },
  goToLeaveBalance() { tt.navigateTo({ url: "/pages/leave-balance/leave-balance" }); },
  goToProfile() { tt.navigateTo({ url: "/pages/profile/profile" }); },
  goToSettings() { tt.navigateTo({ url: "/pages/settings/settings" }); },
  goToNotifications() { tt.navigateTo({ url: "/pages/notifications/notifications" }); },
  goToAttendanceDetail() { tt.navigateTo({ url: "/pages/attendance-detail/attendance-detail?recordId=1" }); },
  goToRequestDetail() { tt.navigateTo({ url: "/pages/request-detail/request-detail?requestId=2" }); },
  handleLogout() {
    tt.showModal({
      title: "Đăng xuất",
      content: "Bạn có chắc muốn đăng xuất khỏi SMA không?",
      cancelText: "Hủy",
      confirmText: "Đăng xuất",
      confirmColor: "#f87171",
      success: (res) => {
        if (res.confirm) app.logout();
      },
    });
  },
});
