// pages/leave-balance/leave-balance.js — Logic số dư phép kết nối backend API
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    total: 0,
    used: 0,
    remaining: 0,
    pct: 0,
    displayBalances: [],
    history: [],
    t: {},
    theme: "light",
  },

  onShow() {
    const t = i18n.getTranslations();
    const theme = i18n.getTheme();

    this.setData({ t, theme });
    this.loadLeaveBalance();
    this.loadLeaveHistory();

    tt.setNavigationBarTitle({
      title: t.leaveBalance.title || "Số ngày phép"
    });
  },

  goBack() {
    tt.navigateBack();
  },

  goToRequestForm() {
    // Navigate to requests tab and trigger create modal if possible
    tt.navigateTo({
      url: "/pages/requests/requests?openCreate=true"
    });
  },

  loadLeaveBalance() {
    tt.request({
      url: app.globalData.apiHost + "/api/leave/balance",
      method: "GET",
      header: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + app.globalData.token,
      },
      success: (res) => {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          this.parseLeaveBalances(res.data);
        } else {
          this.parseLeaveBalances([]);
        }
      },
      fail: () => {
        this.parseLeaveBalances([]);
      }
    });
  },

  loadLeaveHistory() {
    tt.request({
      url: app.globalData.apiHost + "/api/leave/history?limit=10",
      method: "GET",
      header: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + app.globalData.token,
      },
      success: (res) => {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          this.parseLeaveHistory(res.data);
        } else {
          this.parseLeaveHistory([]);
        }
      },
      fail: () => {
        this.parseLeaveHistory([]);
      }
    });
  },

  parseLeaveBalances(apiBalances) {
    const t = this.data.t;
    const theme = this.data.theme;
    const isDark = theme === "dark";

    const styleMeta = {
      annual: {
        iconClass: "icon-annual-indigo",
        iconBg: isDark ? "rgba(99, 102, 241, 0.14)" : "#EEF2FF",
        barColor: "#6366F1"
      },
      sick: {
        iconClass: "icon-sick-emerald",
        iconBg: isDark ? "rgba(16, 185, 129, 0.14)" : "#ECFDF5",
        barColor: "#10B981"
      },
      unpaid: {
        iconClass: "icon-unpaid-orange",
        iconBg: isDark ? "rgba(249, 115, 22, 0.14)" : "#FFF7ED",
        barColor: "#f97316"
      },
      compensatory: {
        iconClass: "icon-compensatory-indigo",
        iconBg: isDark ? "rgba(79, 70, 229, 0.14)" : "#EEF2FF",
        barColor: "#4F46E5"
      },
      maternity: {
        iconClass: "icon-maternity-pink",
        iconBg: isDark ? "rgba(219, 39, 119, 0.14)" : "#FCE7F3",
        barColor: "#db2777"
      }
    };

    let totalVal = 0;
    let usedVal = 0;
    let remainingVal = 0;

    const displayBalances = apiBalances.map(item => {
      const meta = styleMeta[item.id] || styleMeta.annual;
      const total = item.total || 0;
      const used = item.used || 0;
      const remaining = item.remaining || 0;
      const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

      if (item.id === "annual") {
        totalVal = total;
        usedVal = used;
        remainingVal = remaining;
      }

      return {
        name: item.name || t.leaveBalance[item.id + "Leave"] || item.id,
        total,
        used,
        remaining,
        percent,
        ...meta
      };
    });

    if (totalVal === 0) {
      const annualItem = displayBalances.find(b => b.name.indexOf("phép năm") !== -1 || b.name.indexOf("Annual") !== -1);
      if (annualItem) {
        totalVal = annualItem.total;
        usedVal = annualItem.used;
        remainingVal = annualItem.remaining;
      } else if (displayBalances.length > 0) {
        totalVal = displayBalances[0].total;
        usedVal = displayBalances[0].used;
        remainingVal = displayBalances[0].remaining;
      }
    }

    const pct = totalVal > 0 ? Math.round((remainingVal / totalVal) * 100) : 0;

    this.setData({
      total: totalVal,
      used: usedVal,
      remaining: remainingVal,
      pct,
      displayBalances
    });
  },

  parseLeaveHistory(apiHistory) {
    const t = this.data.t;
    const statusMap = {
      approved: { text: t.requests.approved || "Đã duyệt", cls: "success" },
      pending: { text: t.requests.pending || "Chờ duyệt", cls: "warning" },
      rejected: { text: t.requests.rejected || "Từ chối", cls: "danger" }
    };

    const history = apiHistory.slice(0, 5).map(item => {
      const s = statusMap[item.status] || { text: item.status, cls: "warning" };
      const days = item.days || 1;
      const daysText = item.status === "approved" ? `-${days} ${t.common.day || "ngày"}` : `${days} ${t.common.day || "ngày"}`;
      
      let startDateStr = item.startDate || "";
      let endDateStr = item.endDate || "";
      try {
        const sd = new Date(item.startDate);
        const ed = new Date(item.endDate);
        startDateStr = sd.toLocaleDateString("vi-VN", { day: "2-digit", month: "short" });
        endDateStr = ed.toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
      } catch(e) {}

      return {
        id: item.id || Math.random().toString(),
        type: item.type || "Nghỉ phép",
        startDate: startDateStr,
        endDate: endDateStr,
        daysText,
        statusText: s.text,
        statusClass: s.cls
      };
    });

    this.setData({ history });
  }
});
