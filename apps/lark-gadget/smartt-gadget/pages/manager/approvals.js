// pages/manager/approvals.js — Logic phê duyệt đơn
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    activeTab: "PENDING",   // PENDING | APPROVED | REJECTED
    requests: [],
    hasRequests: false,
    pendingCount: 0,
    loading: false,
    t: {},
    theme: "light"
  },

  onLoad() {
    this.loadRequests();
  },

  onShow() {
    const t = i18n.getTranslations();
    const theme = i18n.getTheme();
    this.setData({ t, theme });
    this.loadRequests();

    tt.setNavigationBarTitle({
      title: t.manager.approvals.title
    });
  },

  setTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab }, () => this.loadRequests());
  },

  loadRequests() {
    this.setData({ loading: true });

    const status = this.data.activeTab;
    const queryStatus = status.toLowerCase();
    const isEn = i18n.getLanguage() === "en";
    const t = this.data.t;

    const typeMap = {
      leave: { text: t.requests.leaveTypes.annual || "Nghỉ phép năm", cls: "info" },
      sick: { text: t.requests.leaveTypes.sick || "Nghỉ bệnh", cls: "warning" },
      unpaid: { text: t.requests.leaveTypes.unpaid || "Nghỉ cá nhân", cls: "neutral" },
      compensatory: { text: t.requests.leaveTypes.compensatory || "Nghỉ bù", cls: "info" },
      maternity: { text: t.requests.leaveTypes.maternity || "Nghỉ thai sản", cls: "info" },
      overtime: { text: t.requests.leaveTypes.overtime || "Tăng ca (OT)", cls: "warning" },
      remote: { text: t.requests.leaveTypes.remote || "Làm từ xa", cls: "info" },
      other: { text: t.requests.leaveTypes.other || "Yêu cầu khác", cls: "neutral" },
      early_checkout: { text: isEn ? "Early checkout" : "Check-out sớm", cls: "danger" },
      remote_attendance: { text: isEn ? "Remote attendance" : "Chấm công remote", cls: "info" }
    };

    const statusTxtMap = { 
      pending: { text: t.requests.pending || "Chờ duyệt", cls: "warning" }, 
      approved: { text: t.requests.approved || "Đã duyệt", cls: "success" }, 
      rejected: { text: t.requests.rejected || "Từ chối", cls: "danger" } 
    };

    const requestPromise = (options) => {
      return new Promise((resolve) => {
        app.request({
          ...options,
          success: (res) => resolve({ success: true, res }),
          fail: (err) => resolve({ success: false, err })
        });
      });
    };

    if (queryStatus === "pending") {
      Promise.all([
        requestPromise({ url: "/api/requests?status=pending", method: "GET" }),
        requestPromise({ url: "/api/attendance/pending-early-checkouts", method: "GET" }),
        requestPromise({ url: "/api/attendance/pending-remote", method: "GET" })
      ]).then(([reqRes, earlyRes, remoteRes]) => {
        this.setData({ loading: false });
        let allRequests = [];

        // 1. Regular requests
        if (reqRes.success && reqRes.res.statusCode === 200 && reqRes.res.data && Array.isArray(reqRes.res.data.requests)) {
          const raw = reqRes.res.data.requests;
          allRequests = allRequests.concat(raw.map(r => {
            const mappedType = typeMap[r.type] || typeMap.other;
            const mappedStatus = statusTxtMap[r.status] || { text: r.status, cls: "neutral" };
            return {
              ...r,
              typeText: mappedType.text,
              typeClass: mappedType.cls,
              statusText: mappedStatus.text,
              statusClass: mappedStatus.cls,
              nameInitial: r.employeeName ? r.employeeName.charAt(0) : "?",
              toDate: r.endDate || r.date,
              isPending: true,
            };
          }));
        }

        // 2. Early checkouts
        if (earlyRes.success && earlyRes.res.statusCode === 200 && earlyRes.res.data && Array.isArray(earlyRes.res.data.records)) {
          const records = earlyRes.res.data.records;
          allRequests = allRequests.concat(records.map(record => {
            const hoursWorked = record.workHours ?? record.hoursWorked ?? 0;
            const minutesWorked = Math.round(hoursWorked * 60);
            const reasonText = record.earlyCheckoutReasonText || record.reasonText || record.notes || (isEn ? "No reason" : "Không có lý do");
            return {
              id: record.attendanceId || record.id,
              attendanceId: record.attendanceId || record.id,
              status: "pending",
              type: "early_checkout",
              employeeName: record.employeeName || (record.userId && record.userId.name) || "N/A",
              department: record.department || (record.userId && record.userId.department) || "",
              typeText: typeMap.early_checkout.text,
              typeClass: typeMap.early_checkout.cls,
              statusText: statusTxtMap.pending.text,
              statusClass: statusTxtMap.pending.cls,
              nameInitial: (record.employeeName || (record.userId && record.userId.name) || "?").charAt(0),
              fromDate: record.date,
              toDate: record.date,
              createdAt: record.submittedAt || record.createdAt || record.date || "",
              reason: isEn ? `Worked ${minutesWorked} mins (${hoursWorked.toFixed(2)} hrs). Reason: ${reasonText}` : `Đã làm việc ${minutesWorked} phút (${hoursWorked.toFixed(2)} giờ). Lý do: ${reasonText}`,
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              hoursWorked: hoursWorked.toFixed(2),
              isPending: true,
            };
          }));
        }

        // 3. Remote attendance
        if (remoteRes.success && remoteRes.res.statusCode === 200 && remoteRes.res.data && Array.isArray(remoteRes.res.data.records)) {
          const records = remoteRes.res.data.records;
          allRequests = allRequests.concat(records.map(record => {
            const hoursWorked = record.workHours ?? record.hoursWorked ?? 0;
            const minutesWorked = Math.round(hoursWorked * 60);
            return {
              id: record.attendanceId || record.id,
              attendanceId: record.attendanceId || record.id,
              status: "pending",
              type: "remote_attendance",
              employeeName: record.employeeName || (record.userId && record.userId.name) || "N/A",
              department: record.department || (record.userId && record.userId.department) || "",
              typeText: typeMap.remote_attendance.text,
              typeClass: typeMap.remote_attendance.cls,
              statusText: statusTxtMap.pending.text,
              statusClass: statusTxtMap.pending.cls,
              nameInitial: (record.employeeName || (record.userId && record.userId.name) || "?").charAt(0),
              fromDate: record.date,
              toDate: record.date,
              createdAt: record.submittedAt || record.createdAt || record.date || "",
              reason: isEn ? `Remote attendance. Worked ${minutesWorked} mins (${hoursWorked.toFixed(2)} hrs).` : `Chấm công từ xa. Đã làm việc ${minutesWorked} phút (${hoursWorked.toFixed(2)} giờ).`,
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              hoursWorked: hoursWorked.toFixed(2),
              isPending: true,
            };
          }));
        }

        // Sort by createdAt descending, if not available, fromDate
        allRequests.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.fromDate || 0);
          const dateB = new Date(b.createdAt || b.fromDate || 0);
          return dateB - dateA;
        });

        this.setData({
          requests: allRequests,
          hasRequests: allRequests.length > 0,
          pendingCount: allRequests.length,
        });
      }).catch((err) => {
        this.setData({ loading: false });
        tt.showToast({ title: t.common.error || "Lỗi kết nối", icon: "none" });
      });
    } else {
      app.request({
        url: `/api/requests?status=${queryStatus}`,
        method: "GET",
        success: (res) => {
          this.setData({ loading: false });
          if (res.statusCode === 200 && res.data && Array.isArray(res.data.requests)) {
            const raw = res.data.requests;
            const requests = raw.map(r => {
              const mappedType = typeMap[r.type] || typeMap.other;
              const mappedStatus = statusTxtMap[r.status] || { text: r.status, cls: "neutral" };
              return {
                ...r,
                typeText: mappedType.text,
                typeClass: mappedType.cls,
                statusText: mappedStatus.text,
                statusClass: mappedStatus.cls,
                nameInitial: r.employeeName ? r.employeeName.charAt(0) : "?",
                toDate: r.endDate || r.date,
                isPending: false,
              };
            });

            this.setData({
              requests,
              hasRequests: requests.length > 0,
            });
          } else {
            this.setData({
              requests: [],
              hasRequests: false,
            });
          }
        },
        fail: () => {
          this.setData({ loading: false });
          tt.showToast({ title: t.common.error || "Lỗi kết nối", icon: "none" });
        },
      });
    }
  },

  handleApprove(e) {
    const { id, name, type } = e.currentTarget.dataset;
    const { t } = this.data;
    const isEn = i18n.getLanguage() === "en";
    tt.showModal({
      title: isEn ? "Approve request" : "Xác nhận duyệt đơn",
      content: isEn ? `Approve request for ${name}?` : `Duyệt đơn của ${name}?`,
      cancelText: t.common.cancel,
      confirmText: t.manager.approvals.approve || "Duyệt",
      success: (res) => {
        if (res.confirm) this._submitDecision(id, "APPROVED", type);
      },
    });
  },

  handleReject(e) {
    const { id, name, type } = e.currentTarget.dataset;
    const { t } = this.data;
    const isEn = i18n.getLanguage() === "en";
    tt.showModal({
      title: t.manager.approvals.reject || "Từ chối đơn",
      content: isEn ? `Reject request for ${name}?` : `Từ chối đơn của ${name}?`,
      cancelText: t.common.cancel,
      confirmText: t.manager.approvals.reject || "Từ chối",
      confirmColor: "#ef4444",
      success: (res) => {
        if (res.confirm) this._submitDecision(id, "REJECTED", type);
      },
    });
  },

  _submitDecision(requestId, status, type) {
    const { t } = this.data;
    tt.showLoading({ title: t.common.loading || "Đang xử lý..." });

    let url = "";
    let method = "POST";
    let data = {};

    if (type === "early_checkout") {
      url = `/api/attendance/${requestId}/approve`;
      method = "PATCH";
      data = {
        approvalStatus: status,
        notes: status === "APPROVED" ? "Approved" : "Rejected"
      };
    } else if (type === "remote_attendance") {
      url = `/api/attendance/${requestId}/approve-remote`;
      method = "PATCH";
      data = {
        approvalStatus: status,
        notes: status === "APPROVED" ? "Approved" : "Rejected"
      };
    } else {
      const endpoint = status === "APPROVED" ? "approve" : "reject";
      url = `/api/requests/${requestId}/${endpoint}`;
      method = "POST";
      data = { comments: status === "APPROVED" ? "Approved" : "Rejected" };
    }

    app.request({
      url,
      method,
      data,
      success: (res) => {
        tt.hideLoading();
        if (res.statusCode === 200) {
          const isEn = i18n.getLanguage() === "en";
          const msg = status === "APPROVED" 
            ? (isEn ? "Approved successfully" : "Đã duyệt đơn thành công") 
            : (isEn ? "Rejected successfully" : "Đã từ chối đơn");
          tt.showToast({ title: msg, icon: "none" });
          this.loadRequests();
        } else {
          tt.showToast({ title: res.data.message || (t.common.error || "Thao tác thất bại"), icon: "none" });
        }
      },
      fail: () => {
        tt.hideLoading();
        tt.showToast({ title: t.common.error || "Lỗi kết nối", icon: "none" });
      },
    });
  },
});
