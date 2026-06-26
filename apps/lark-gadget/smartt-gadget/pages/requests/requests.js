// pages/requests/requests.js — Logic quản lý đơn từ kết nối backend API
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    requests: [],
    filteredRequests: [],
    tabs: [],
    activeTab: 0,
    showTypePicker: false,
    showForm: false,
    sheetOptions: [],
    formType: "leave",
    formTypeLabel: "",
    startDateStr: "",
    endDateStr: "",
    reason: "",
    submitLoading: false,
    t: {},
    theme: "light",
    userRole: "employee"
  },

  onLoad(options) {
    if (options) {
      if (options.type) {
        this.pendingType = options.type;
      } else if (options.openCreate === "true") {
        this.pendingOpenCreate = true;
      }
    }
  },

  onShow() {
    const t = i18n.getTranslations();
    const theme = i18n.getTheme();
    const isEn = i18n.getLanguage() === "en";
    const userRole = app.globalData.userRole || "employee";

    const tabs = isEn 
      ? ["All", "Pending", "Approved", "Rejected"] 
      : ["Tất cả", "Chờ duyệt", "Đã duyệt", "Từ chối"];

    const TYPE_META = {
      leave: { bg: "rgba(99, 102, 241, 0.14)" },
      sick: { bg: "rgba(16, 185, 129, 0.14)" },
      unpaid: { bg: "rgba(249, 115, 22, 0.14)" },
      compensatory: { bg: "rgba(99, 102, 241, 0.14)" },
      maternity: { bg: "rgba(219, 39, 119, 0.14)" },
      overtime: { bg: "rgba(217, 119, 6, 0.14)" },
      remote: { bg: "rgba(6, 182, 212, 0.14)" },
      other: { bg: "rgba(100, 116, 139, 0.14)" }
    };

    const sheetOptions = [
      { id: "leave", label: t.requests.leaveTypes.annual || "Nghỉ phép năm", sub: isEn ? "Annual leave days" : "Sử dụng phép năm tích lũy", bg: TYPE_META.leave.bg },
      { id: "sick", label: t.requests.leaveTypes.sick || "Nghỉ ốm", sub: isEn ? "Sick leave" : "Nghỉ khi ốm đau, đi khám bệnh", bg: TYPE_META.sick.bg },
      { id: "unpaid", label: t.requests.leaveTypes.unpaid || "Nghỉ không lương", sub: isEn ? "Unpaid leave" : "Nghỉ việc riêng không lương", bg: TYPE_META.unpaid.bg },
      { id: "compensatory", label: t.requests.leaveTypes.compensatory || "Nghỉ bù", sub: isEn ? "Compensatory leave" : "Nghỉ bù cho thời gian làm thêm giờ", bg: TYPE_META.compensatory.bg },
      { id: "maternity", label: t.requests.leaveTypes.maternity || "Nghỉ thai sản", sub: isEn ? "Maternity leave" : "Nghỉ theo chế độ thai sản", bg: TYPE_META.maternity.bg },
      { id: "overtime", label: t.requests.leaveTypes.overtime || "Tăng ca (OT)", sub: isEn ? "Overtime work request" : "Đăng ký tăng ca ngoài giờ", bg: TYPE_META.overtime.bg },
      { id: "remote", label: t.requests.leaveTypes.remote || "Làm từ xa", sub: isEn ? "Work from remote" : "Làm việc tại nhà hoặc từ xa", bg: TYPE_META.remote.bg },
      { id: "other", label: t.requests.leaveTypes.other || "Khác", sub: isEn ? "Other requests" : "Đơn yêu cầu khác", bg: TYPE_META.other.bg }
    ];

    const today = new Date();
    const todayStr = this.formatDateString(today);

    this.setData({
      t,
      theme,
      tabs,
      sheetOptions,
      userRole,
      startDateStr: this.data.startDateStr || todayStr,
      endDateStr: this.data.endDateStr || todayStr
    });

    tt.setNavigationBarTitle({
      title: t.requests.title || "Yêu cầu & Đơn từ"
    });

    // Handle incoming parameters from dashboard
    if (this.pendingType) {
      const typeId = this.pendingType;
      this.pendingType = null;
      const option = sheetOptions.find(opt => opt.id === typeId);
      this.setData({
        formType: typeId,
        formTypeLabel: option ? option.label : typeId,
        showTypePicker: false,
        showForm: true
      });
    } else if (this.pendingOpenCreate) {
      this.pendingOpenCreate = null;
      this.setData({
        showTypePicker: true,
        showForm: false
      });
    }

    this.fetchRequestsList();
  },

  formatDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  fetchRequestsList() {
    app.request({
      url: "/api/requests/my",
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.requests)) {
          this.parseRequests(res.data.requests);
        } else {
          this.parseRequests([]);
        }
      },
      fail: () => {
        this.parseRequests([]);
      }
    });
  },

  parseRequests(apiRequests) {
    const t = this.data.t;
    const isEn = i18n.getLanguage() === "en";

    const statusMap = {
      approved: { text: t.requests.approved || "Đã duyệt", cls: "success" },
      pending: { text: t.requests.pending || "Chờ duyệt", cls: "warning" },
      rejected: { text: t.requests.rejected || "Từ chối", cls: "danger" }
    };

    const TYPE_META = {
      leave: { bg: "rgba(99, 102, 241, 0.14)" },
      sick: { bg: "rgba(16, 185, 129, 0.14)" },
      unpaid: { bg: "rgba(249, 115, 22, 0.14)" },
      compensatory: { bg: "rgba(99, 102, 241, 0.14)" },
      maternity: { bg: "rgba(219, 39, 119, 0.14)" },
      overtime: { bg: "rgba(217, 119, 6, 0.14)" },
      remote: { bg: "rgba(6, 182, 212, 0.14)" },
      other: { bg: "rgba(100, 116, 139, 0.14)" }
    };

    const requests = apiRequests.map(item => {
      const s = statusMap[item.status] || { text: item.status, cls: "neutral" };
      const meta = TYPE_META[item.type] || TYPE_META.other;
      
      let endDateStr = "--";
      if (item.duration) {
        endDateStr = item.duration;
      }

      return {
        id: item.id || item._id,
        type: item.type,
        title: item.title || t.requests.leaveTypes[item.type] || item.type,
        reason: item.reason,
        status: item.status,
        statusText: s.text,
        statusClass: s.cls,
        date: item.date || item.startDate,
        endDate: endDateStr,
        createdAt: item.createdAt || "--",
        rejectionReason: item.rejectionReason,
        meta
      };
    });

    this.setData({ requests });
    this.filterRequestsList();
  },

  filterRequestsList() {
    const { requests, activeTab } = this.data;
    let filteredRequests = [];

    if (activeTab === 0) {
      filteredRequests = requests;
    } else if (activeTab === 1) {
      filteredRequests = requests.filter(r => r.status === "pending");
    } else if (activeTab === 2) {
      filteredRequests = requests.filter(r => r.status === "approved");
    } else if (activeTab === 3) {
      filteredRequests = requests.filter(r => r.status === "rejected");
    }

    this.setData({ filteredRequests });
  },

  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ activeTab: index }, () => {
      this.filterRequestsList();
    });
  },

  openTypePicker() {
    this.setData({ showTypePicker: true, showForm: false });
  },

  closeTypePicker() {
    this.setData({ showTypePicker: false });
  },

  selectRequestType(e) {
    const typeId = e.currentTarget.dataset.id;
    const option = this.data.sheetOptions.find(opt => opt.id === typeId);
    
    this.setData({
      formType: typeId,
      formTypeLabel: option ? option.label : typeId,
      showTypePicker: false,
      showForm: true
    });
  },

  closeForm() {
    this.setData({ showForm: false });
  },

  onStartDateChange(e) {
    this.setData({ startDateStr: e.detail.value });
  },

  onEndDateChange(e) {
    this.setData({ endDateStr: e.detail.value });
  },

  onReasonInput(e) {
    this.setData({ reason: e.detail.value });
  },

  stopBubble() {
    // Prevent event propagation
  },

  submitRequest() {
    const { formType, startDateStr, endDateStr, reason, t } = this.data;

    if (!reason.trim()) {
      tt.showToast({
        title: t.requests.fillAll || "Vui lòng điền đầy đủ thông tin",
        icon: "none"
      });
      return;
    }

    if (new Date(startDateStr) > new Date(endDateStr)) {
      tt.showToast({
        title: "Ngày bắt đầu phải trước ngày kết thúc",
        icon: "none"
      });
      return;
    }

    this.setData({ submitLoading: true });

    app.request({
      url: "/api/requests",
      method: "POST",
      data: {
        type: formType,
        startDate: startDateStr,
        endDate: endDateStr,
        reason: reason,
        description: reason,
        urgency: "medium"
      },
      success: (res) => {
        this.setData({ submitLoading: false });
        if (res.statusCode === 201 || res.statusCode === 200) {
          tt.showToast({
            title: t.requests.submitSuccess || "Gửi đơn thành công!",
            icon: "success"
          });
          this.setData({
            showForm: false,
            reason: ""
          });
          this.fetchRequestsList();
        } else {
          const errMsg = res.data && res.data.message ? res.data.message : (t.requests.submitError || "Gửi đơn thất bại");
          tt.showToast({
            title: errMsg,
            icon: "none"
          });
        }
      },
      fail: () => {
        this.setData({ submitLoading: false });
        tt.showToast({
          title: t.requests.submitError || "Gửi đơn thất bại",
          icon: "none"
        });
      }
    });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    tt.navigateTo({
      url: `/pages/request-detail/request-detail?requestId=${id}`
    });
  }
});
