const i18n = require("../../utils/i18n.js");

Component({
  properties: {
    activeTab: {
      type: String,
      value: ""
    },
    userRole: {
      type: String,
      value: "",
      observer(newVal) {
        if (newVal) {
          this.updateTabs();
        }
      }
    }
  },

  data: {
    tabs: [],
    theme: "light",
    role: "EMPLOYEE"
  },

  lifetimes: {
    attached() {
      this.updateTabs();
    }
  },

  pageLifetimes: {
    show() {
      this.updateTabs();
    }
  },

  methods: {
    updateTabs() {
      const app = getApp();
      const theme = i18n.getTheme();
      const t = i18n.getTranslations();
      
      const role = this.data.userRole || (app && app.globalData && app.globalData.userRole) || "EMPLOYEE";
      const tabs = this.getTabsList(role, t);
      
      this.setData({
        tabs,
        theme,
        role
      });
    },

    getTabsList(role, t) {
      if (role === 'MANAGER' || role === 'ADMIN') {
        return [
          { id: 'home', icon: 'grid', label: (t.nav && t.nav.home) || 'Trang chủ', url: '/pages/dashboard/dashboard' },
          { id: 'team', icon: 'people', label: 'Team', url: '/pages/manager/team-status' },
          { id: 'approvals', icon: 'checkmark-done', label: (t.manager && t.manager.dashboard && t.manager.dashboard.approvals) || 'Duyệt đơn', url: '/pages/manager/approvals', isCenter: true },
          { id: 'schedule', icon: 'calendar', label: (t.nav && t.nav.schedule) || 'Lịch', url: '/pages/schedule/schedule' },
          { id: 'profile', icon: 'profile', label: (t.nav && t.nav.profile) || 'Tôi', url: '/pages/profile/profile' }
        ];
      } else {
        return [
          { id: 'home', icon: 'home', label: (t.nav && t.nav.home) || 'Trang chủ', url: '/pages/dashboard/dashboard' },
          { id: 'schedule', icon: 'calendar', label: (t.nav && t.nav.schedule) || 'Lịch', url: '/pages/schedule/schedule' },
          { id: 'attendance', icon: 'camera', label: 'Check-in', url: '/pages/attendance/attendance', isCenter: true },
          { id: 'requests', icon: 'document', label: (t.dashboard && t.dashboard.requests) || 'Đơn từ', url: '/pages/requests/requests' },
          { id: 'profile', icon: 'profile', label: (t.nav && t.nav.profile) || 'Cá nhân', url: '/pages/profile/profile' }
        ];
      }
    },

    onTabTap(e) {
      const { index } = e.currentTarget.dataset;
      const tab = this.data.tabs[index];
      if (!tab) return;

      if (tab.id === this.data.activeTab) {
        return;
      }

      tt.redirectTo({
        url: tab.url,
        fail(err) {
          console.error("Tab navigation failed:", err);
        }
      });
    }
  }
});
