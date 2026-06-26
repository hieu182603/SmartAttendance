// pages/manager/team-status.js — Theo dõi đội nhóm
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    todayStr: "",
    allMembers: [],
    filteredMembers: [],
    searchQuery: "",
    statusFilter: "",
    loading: false,
    stats: { total: 0, onTime: 0, late: 0, absent: 0 },
    t: {},
    theme: "light"
  },

  onLoad() {
    const now = new Date();
    const isEn = i18n.getLanguage() === "en";
    const daysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const daysVi = ["CN","T2","T3","T4","T5","T6","T7"];
    const dayName = isEn ? daysEn[now.getDay()] : daysVi[now.getDay()];
    this.setData({
      todayStr: `${dayName} ${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`
    });
    this.loadTeam();
  },

  onShow() {
    const t = i18n.getTranslations();
    const theme = i18n.getTheme();
    this.setData({ t, theme });
    this.loadTeam();

    tt.setNavigationBarTitle({
      title: t.dashboard.teamToday
    });
  },

  setTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab }, () => this.loadRequests());
  },

  loadTeam() {
    this.setData({ loading: true });

    app.request({
      url: "/api/users/my-team",
      method: "GET",
      success: (resUsers) => {
        if (resUsers.statusCode === 200 && resUsers.data && Array.isArray(resUsers.data.users)) {
          const teamUsers = resUsers.data.users;

          app.request({
            url: "/api/attendance/department",
            method: "GET",
            success: (resAtt) => {
              this.setData({ loading: false });
              
              const records = (resAtt.statusCode === 200 && resAtt.data && Array.isArray(resAtt.data.records)) 
                ? resAtt.data.records 
                : [];

              const t = this.data.t;
              const isEn = i18n.getLanguage() === "en";

              const statusMap = {
                on_time: { text: t.attendance.onTime || "Đúng giờ", cls: "success", statusKey: "ON_TIME" },
                late: { text: t.attendance.late || "Đi muộn", cls: "warning", statusKey: "LATE" },
                absent: { text: t.attendance.absent || "Vắng mặt", cls: "danger", statusKey: "ABSENT" },
                checked_out: { text: isEn ? "Checked Out" : "Đã về", cls: "info", statusKey: "CHECKED_OUT" },
                not_yet: { text: t.dashboard.notWorking || "Chưa vào", cls: "neutral", statusKey: "NOT_YET" }
              };

              const allMembers = teamUsers.map(u => {
                const att = records.find(r => r.userId === u._id || (r.userId && r.userId._id === u._id));
                let status = "not_yet";
                let checkIn = "--";
                let checkOut = "--";

                if (att) {
                  if (att.checkOut) {
                    status = "checked_out";
                  } else if (att.status === "late") {
                    status = "late";
                  } else if (att.status === "present" || att.status === "ontime") {
                    status = "on_time";
                  } else if (att.status === "absent") {
                    status = "absent";
                  }
                  checkIn = att.checkIn || "--";
                  checkOut = att.checkOut || "--";
                }

                const s = statusMap[status] || statusMap.not_yet;
                let initial = "?";
                if (u.fullName) {
                  const parts = u.fullName.trim().split(" ");
                  initial = parts[parts.length - 1].charAt(0).toUpperCase();
                }

                return {
                  _id: u._id,
                  fullName: u.fullName,
                  email: u.email,
                  position: u.position || "Nhân viên",
                  role: u.role,
                  status: s.statusKey,
                  statusText: s.text,
                  statusClass: s.cls,
                  checkInTime: checkIn,
                  checkOutTime: checkOut,
                  nameInitial: initial
                };
              });

              const stats = {
                total: allMembers.length,
                onTime: allMembers.filter(m => m.status === "ON_TIME").length,
                late: allMembers.filter(m => m.status === "LATE").length,
                absent: allMembers.filter(m => m.status === "ABSENT").length,
              };

              this.setData({ allMembers, stats });
              this._applyFilters();
            },
            fail: () => {
              this.setData({ loading: false });
              this._showEmpty();
            }
          });
        } else {
          this.setData({ loading: false });
          this._showEmpty();
        }
      },
      fail: () => {
        this.setData({ loading: false });
        this._showEmpty();
      }
    });
  },

  _showEmpty() {
    this.setData({
      allMembers: [],
      stats: { total: 0, onTime: 0, late: 0, absent: 0 }
    });
    this._applyFilters();
  },

  onSearch(e) {
    this.setData({ searchQuery: e.detail.value }, () => this._applyFilters());
  },

  filterByStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ statusFilter: status }, () => this._applyFilters());
  },

  _applyFilters() {
    let result = this.data.allMembers;
    const q = this.data.searchQuery.toLowerCase().trim();
    const sf = this.data.statusFilter;

    if (q) {
      result = result.filter(m => m.fullName.toLowerCase().includes(q));
    }
    if (sf) {
      result = result.filter(m => m.status === sf);
    }

    this.setData({ filteredMembers: result });
  },
});
