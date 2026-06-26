// pages/request-detail/request-detail.js
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    request: {},
    timeline: [],
    t: {},
    theme: "light",
    requestId: ""
  },

  onLoad(options) {
    if (options.requestId) {
      this.setData({ requestId: options.requestId });
    }
  },

  onShow() {
    const t = i18n.getTranslations();
    const theme = i18n.getTheme();
    this.setData({ t, theme });

    tt.setNavigationBarTitle({
      title: t.requestDetail.title
    });

    this.loadRequest();
  },

  loadRequest() {
    const id = this.data.requestId;
    if (!id) return;

    app.request({
      url: "/api/requests/my?limit=100",
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const list = res.data.requests || [];
          const r = list.find((item) => (item.id || item._id) === id);
          if (r) this._render(r);
        }
      },
      fail: () => {
        tt.showToast({ title: this.data.t.common.error || "Lỗi kết nối", icon: "none" });
      },
    });
  },

  _render(r) {
    const t = this.data.t;
    const statusMap = {
      approved: { text: t.requests.approved || "Đã duyệt", cls: "success" },
      pending: { text: t.requests.pending || "Chờ duyệt", cls: "warning" },
      rejected: { text: t.requests.rejected || "Từ chối", cls: "danger" },
    };
    const st = statusMap[r.status] || { text: r.status, cls: "neutral" };
    const isEn = i18n.getLanguage() === "en";

    const request = {
      id: r.id || r._id,
      type: r.title || r.type,
      reason: r.reason,
      statusText: st.text,
      statusClass: st.cls,
      date: r.date,
      submittedAt: r.createdAt || r.date,
      duration: r.duration,
    };

    // Tiến trình suy ra từ trạng thái (backend list không trả timeline chi tiết)
    const timeline = [
      {
        action: isEn ? "Submitted request" : "Gửi yêu cầu phê duyệt",
        actor: r.employeeName || "",
        time: r.createdAt || r.date,
        active: r.status !== "pending",
      },
      {
        action:
          r.status === "approved"
            ? (isEn ? "Approved request" : "Đã phê duyệt")
            : r.status === "rejected"
            ? (isEn ? "Rejected request" : "Đã từ chối")
            : (isEn ? "Pending manager review" : "Đang chờ quản lý xem xét"),
        actor: "",
        time: "",
        active: r.status !== "pending",
      },
    ];

    this.setData({ request, timeline });
  },

  goBack() {
    tt.navigateBack({ delta: 1 });
  }
});
