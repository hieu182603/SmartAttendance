// pages/payslip/payslip.js
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    currentMonth: 0,
    currentYear: 0,
    currentMonthStr: "00",
    record: {},
    loading: false,
    hasRecord: false,
    showSalary: true,
    theme: "light",
    t: {}
  },

  onLoad() {
    // Mac dinh là tháng trước
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    
    this.setData({
      currentMonth: d.getMonth() + 1,
      currentYear: d.getFullYear(),
      currentMonthStr: String(d.getMonth() + 1).padStart(2, "0")
    });
  },

  onShow() {
    const theme = i18n.getTheme();
    const t = i18n.getTranslations();
    this.setData({ t, theme });
    
    tt.setNavigationBarTitle({
      title: t.profile.payslip || "Phiếu lương"
    });

    this.loadPayslip();
  },

  toggleShowSalary() {
    this.setData({
      showSalary: !this.data.showSalary
    });
  },

  loadPayslip() {
    this.setData({ loading: true });
    const month = `${this.data.currentYear}-${this.data.currentMonthStr}`;

    app.request({
      url: `/api/payroll/my-payslip?month=${month}`,
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.data) {
          const rawRecord = res.data.data;
          this.setData({
            loading: false,
            hasRecord: true,
            record: this.formatPayrollRecord(rawRecord)
          });
        } else {
          // Chưa có phiếu lương cho kỳ này
          this.setData({ loading: false, hasRecord: false, record: {} });
        }
      },
      fail: () => {
        this.setData({ loading: false, hasRecord: false, record: {} });
        tt.showToast({ title: this.data.t.common.error || "Lỗi kết nối", icon: "none" });
      }
    });
  },

  formatPayrollRecord(rec) {
    const formatVND = (n) => {
      const val = Number.isFinite(n) ? n : 0;
      return Math.round(val).toLocaleString("vi-VN") + " ₫";
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    };

    const isEn = i18n.getLanguage() === "en";
    const statusMap = {
      pending: isEn ? "Pending" : "Chờ thanh toán",
      approved: isEn ? "Approved" : "Đã duyệt",
      paid: isEn ? "Paid" : "Đã thanh toán"
    };

    const baseSalaryForCalc = rec.actualBaseSalary ?? rec.baseSalary;
    const grossSalary = baseSalaryForCalc + (rec.overtimePay || 0) + (rec.bonus || 0) - (rec.deductions || 0);
    const insTotal = rec.insurance?.total ?? 0;
    const taxAmount = rec.tax?.amount ?? 0;
    const netSalary = rec.netSalary ?? Math.max(0, grossSalary - insTotal - taxAmount);

    return {
      ...rec,
      employeeName: rec.userId?.name || app.globalData.userInfo?.fullName || "Nhân viên",
      employeeId: rec.userId?.employeeId || "EMP" + (app.globalData.userInfo?.id || "2026").substring(0, 4),
      department: rec.department || app.globalData.userInfo?.department || "Engineering",
      position: rec.position || app.globalData.userInfo?.position || "Software Engineer",
      
      periodLabel: `Kỳ lương: ${formatDate(rec.periodStart)} – ${formatDate(rec.periodEnd)}`,
      statusText: statusMap[rec.status] || rec.status,

      baseSalaryFormatted: formatVND(rec.baseSalary),
      actualBaseSalaryFormatted: formatVND(baseSalaryForCalc),
      overtimePayFormatted: formatVND(rec.overtimePay || 0),
      bonusFormatted: formatVND(rec.bonus || 0),
      grossSalaryFormatted: formatVND(grossSalary),
      
      insuranceSocialFormatted: formatVND(rec.insurance?.social || 0),
      insuranceHealthFormatted: formatVND(rec.insurance?.health || 0),
      insuranceUnemploymentFormatted: formatVND(rec.insurance?.unemployment || 0),
      
      taxAmountFormatted: formatVND(taxAmount),
      deductionsFormatted: formatVND(rec.deductions || 0),
      totalDeductionsFormatted: formatVND(insTotal + taxAmount + (rec.deductions || 0)),
      netSalaryFormatted: formatVND(netSalary)
    };
  },

  prevMonth() {
    let { currentMonth, currentYear } = this.data;
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    this.setData({
      currentMonth,
      currentYear,
      currentMonthStr: String(currentMonth).padStart(2, "0")
    }, () => this.loadPayslip());
  },

  nextMonth() {
    let { currentMonth, currentYear } = this.data;
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    this.setData({
      currentMonth,
      currentYear,
      currentMonthStr: String(currentMonth).padStart(2, "0")
    }, () => this.loadPayslip());
  },

  // ===== Xuất PDF =====
  exportPDF() {
    if (!this.data.hasRecord) {
      tt.showToast({ title: this.data.t.payslip && this.data.t.payslip.noData || "Chưa có phiếu lương", icon: "none" });
      return;
    }
    const month = `${this.data.currentYear}-${this.data.currentMonthStr}`;
    this.triggerDownload("pdf", month, app.globalData.token);
  },

  // ===== Xuất Excel =====
  exportExcel() {
    if (!this.data.hasRecord) {
      tt.showToast({ title: this.data.t.payslip && this.data.t.payslip.noData || "Chưa có phiếu lương", icon: "none" });
      return;
    }
    const month = `${this.data.currentYear}-${this.data.currentMonthStr}`;
    this.triggerDownload("excel", month, app.globalData.token);
  },

  triggerDownload(type, month, token) {
    const isEn = i18n.getLanguage() === "en";
    tt.showLoading({ title: isEn ? "Downloading..." : "Đang tải file..." });

    const fileExtension = type === "pdf" ? "pdf" : "xlsx";
    const downloadUrl = `${app.globalData.apiHost}/api/payroll/my-payslip/${type}?month=${month}`;

    tt.downloadFile({
      url: downloadUrl,
      header: {
        Authorization: token ? `Bearer ${token}` : ""
      },
      success: (res) => {
        tt.hideLoading();
        if (res.statusCode === 200 && res.tempFilePath) {
          tt.openDocument({
            filePath: res.tempFilePath,
            fileType: type === "pdf" ? "pdf" : "xlsx",
            success: () => {
              console.log(`Open ${type} success`);
            },
            fail: () => {
              tt.showToast({
                title: isEn ? "Cannot open document" : "Không thể mở tài liệu",
                icon: "none"
              });
            }
          });
        } else {
          tt.showToast({
            title: isEn ? "Download failed" : "Tải tài liệu thất bại",
            icon: "none"
          });
        }
      },
      fail: () => {
        tt.hideLoading();
        tt.showToast({
          title: isEn ? "Network error" : "Lỗi kết nối tải file",
          icon: "none"
        });
      }
    });
  }
});
