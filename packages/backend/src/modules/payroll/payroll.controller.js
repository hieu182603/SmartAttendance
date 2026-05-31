import mongoose from "mongoose";
import { PayrollReportModel } from "./payroll.model.js";
import { emitPayrollUpdate } from "../../config/socket.js";
import { generatePayrollForMonth, generatePayrollRecord, previewPayrollRecord } from "./payroll.service.js";
import { resolveTenantCompanyId, canAccessUserTenant } from "../../utils/tenantCompany.util.js";

const sanitizeNumber = (value = 0) => {
  if (Number.isFinite(value)) return value;
  return 0;
};

const buildTrendFromReports = (reports) => {
  if (!Array.isArray(reports) || reports.length === 0) return [];
  return reports
    .slice(0, 5)
    .map((report) => ({
      month: report.month,
      total: Math.round(sanitizeNumber(report.totalSalary) / 1_000_000), // về đơn vị triệu
      employees: sanitizeNumber(report.totalEmployees),
    }))
    .reverse();
};

const buildDepartmentStats = (records, totalSalary) => {
  const departmentStats = {};
  records.forEach((record) => {
    const dept = record.department || "N/A";
    if (!departmentStats[dept]) {
      departmentStats[dept] = {
        department: dept,
        employees: 0,
        totalSalary: 0,
        avgSalary: 0,
        percentage: 0,
      };
    }
    departmentStats[dept].employees++;
    departmentStats[dept].totalSalary += sanitizeNumber(record.totalSalary);
  });

  Object.values(departmentStats).forEach((stat) => {
    stat.avgSalary = stat.employees > 0 ? stat.totalSalary / stat.employees : 0;
    stat.percentage =
      totalSalary > 0
        ? Math.round((stat.totalSalary / totalSalary) * 1000) / 10
        : 0;
  });

  return Object.values(departmentStats);
};

const buildReportFromRecords = (month, records, companyId) => {
  const [year, monthNum] = month.split("-").map(Number);
  const periodStart = new Date(Date.UTC(year, monthNum - 1, 1));
  const periodEnd = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));

  const totalEmployees = records.length;
  const totalSalary = records.reduce(
    (sum, r) => sum + sanitizeNumber(r.totalSalary),
    0
  );
  const totalBonuses = records.reduce((sum, r) => sum + sanitizeNumber(r.bonus), 0);
  const totalDeductions = records.reduce(
    (sum, r) => sum + sanitizeNumber(r.deductions),
    0
  );
  const netPay = totalSalary;
  const avgSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0;

  return {
    month,
    periodStart,
    periodEnd,
    companyId: companyId || null,
    totalEmployees,
    totalSalary,
    totalBonuses,
    totalDeductions,
    netPay,
    avgSalary,
    departmentStats: buildDepartmentStats(records, totalSalary),
  };
};

const resolveRequestUserId = (req) => {
  const raw = req.user?.userId ?? req.user?.userContext?.userId;
  if (!raw) return null;
  const id = raw.toString();
  return mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : raw;
};

const buildPayrollRecordFilter = async (companyId) => {
  if (!companyId) return {};

  const { UserModel } = await import("../users/user.model.js");
  const companyObjectId = new mongoose.Types.ObjectId(companyId);
  const userIds = await UserModel.find({ companyId: companyObjectId }).distinct("_id");

  return {
    $or: [
      { companyId: companyObjectId },
      { companyId: null, userId: { $in: userIds } },
      { companyId: { $exists: false }, userId: { $in: userIds } },
    ],
  };
};

const buildReportsFromRecords = async (companyId, limitNum) => {
  const { PayrollRecordModel } = await import("./payroll.model.js");
  const recordFilter = await buildPayrollRecordFilter(companyId);
  const months = await PayrollRecordModel.distinct("month", recordFilter);
  months.sort((a, b) => b.localeCompare(a));

  const reports = [];
  for (const month of months.slice(0, limitNum)) {
    const monthRecords = await PayrollRecordModel.find({ ...recordFilter, month }).lean();
    if (monthRecords.length > 0) {
      reports.push(buildReportFromRecords(month, monthRecords, companyId));
    }
  }

  return reports.sort((a, b) => b.periodStart - a.periodStart);
};

export const getPayrollReports = async (req, res) => {
  try {
    const { month, limit = 6 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 24);
    const companyId = resolveTenantCompanyId(req) ?? req.user?.companyId ?? null;

    const reportsQuery = {};
    if (companyId) reportsQuery.companyId = companyId;

    let reports = await PayrollReportModel.find(reportsQuery)
      .sort({ periodStart: -1 })
      .limit(limitNum)
      .lean();

    if (!reports.length) {
      reports = await buildReportsFromRecords(companyId, limitNum);
    }

    if (!reports.length) {
      return res.json({
        summary: [],
        departments: [],
        monthlyTrend: [],
      });
    }

    const summary = reports.map((report) => ({
      month: report.month,
      totalEmployees: sanitizeNumber(report.totalEmployees),
      totalSalary: sanitizeNumber(report.totalSalary),
      totalBonuses: sanitizeNumber(report.totalBonuses),
      totalDeductions: sanitizeNumber(report.totalDeductions),
      netPay: sanitizeNumber(report.netPay),
      avgSalary: sanitizeNumber(report.avgSalary),
    }));

    const selectedReport =
      (month && reports.find((r) => r.month === month)) || reports[0];

    const monthlyTrend =
      selectedReport?.monthlyTrend?.length
        ? selectedReport.monthlyTrend.map((item) => ({
            month: item.month,
            total: sanitizeNumber(item.total),
            employees: sanitizeNumber(item.employees),
          }))
        : buildTrendFromReports(reports);

    res.json({
      summary,
      departments: selectedReport?.departmentStats || [],
      monthlyTrend,
    });
  } catch (error) {
    console.error("[payroll] get reports error", error);
    res.status(500).json({ message: "Không lấy được báo cáo lương" });
  }
};


/**
 * Get payroll records (chi tiết bảng lương từng nhân viên)
 */
export const getPayrollRecords = async (req, res) => {
  try {
    const { PayrollRecordModel } = await import("./payroll.model.js");
    const { month, status, department, page = 1, limit = 100 } = req.query;
    const companyId = resolveTenantCompanyId(req) ?? req.user?.companyId ?? null;

    const tenantFilter = await buildPayrollRecordFilter(companyId);
    const extraFilter = {};
    if (month) extraFilter.month = month;
    if (status) extraFilter.status = status;
    if (department) {
      if (mongoose.Types.ObjectId.isValid(department)) {
        extraFilter.departmentId = department;
      } else {
        extraFilter.department = department;
      }
    }

    const query =
      Object.keys(tenantFilter).length > 0
        ? { $and: [tenantFilter, extraFilter] }
        : extraFilter;

    // Pagination
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [records, total] = await Promise.all([
      PayrollRecordModel.find(query)
        .populate("userId", "name email employeeId")
        .sort({ month: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PayrollRecordModel.countDocuments(query),
    ]);

    res.json({
      records,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[payroll] get records error", error);
    res.status(500).json({ message: "Không lấy được dữ liệu bảng lương" });
  }
};

/**
 * Get payroll record by ID
 */
export const getPayrollRecordById = async (req, res) => {
  try {
    const { PayrollRecordModel } = await import("./payroll.model.js");
    const { id } = req.params;

    const record = await PayrollRecordModel.findById(id)
      .populate("userId", "name email employeeId department position")
      .populate("approvedBy", "name email")
      .lean();

    if (!record) {
      return res.status(404).json({ message: "Không tìm thấy bảng lương" });
    }

    // HR_MANAGER can only view payroll records within their own department
    const requestorRole = req.user?.role;
    if (requestorRole !== "ADMIN" && requestorRole !== "SUPER_ADMIN") {
      const { UserModel } = await import("../users/user.model.js");
      const requestor = await UserModel.findById(req.user?.userId).select("department").lean();
      const targetDept = record.userId?.department?.toString();
      const requestorDept = requestor?.department?.toString();
      if (!requestorDept || !targetDept || requestorDept !== targetDept) {
        return res.status(403).json({ message: "Không có quyền xem bảng lương này" });
      }
    }

    res.json({ data: record });
  } catch (error) {
    console.error("[payroll] get record by id error", error);
    res.status(500).json({ message: "Không lấy được chi tiết bảng lương" });
  }
};

/**
 * Approve payroll record
 */
export const approvePayrollRecord = async (req, res) => {
  try {
    const { PayrollRecordModel } = await import("./payroll.model.js");
    const { id } = req.params;
    const userId = req.user?.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const record = await PayrollRecordModel.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Không tìm thấy bảng lương" });
    }

    // HR_MANAGER can only approve payroll records within their own department
    const requestorRole = req.user?.role;
    if (requestorRole !== "ADMIN" && requestorRole !== "SUPER_ADMIN") {
      const { UserModel } = await import("../users/user.model.js");
      const [requestor, targetUser] = await Promise.all([
        UserModel.findById(userId).select("department").lean(),
        UserModel.findById(record.userId).select("department").lean(),
      ]);
      if (
        !requestor?.department ||
        !targetUser?.department ||
        requestor.department.toString() !== targetUser.department.toString()
      ) {
        return res.status(403).json({ message: "Không có quyền duyệt bảng lương này" });
      }
    }

    if (record.status !== "pending") {
      return res.status(400).json({ message: "Bảng lương đã được duyệt" });
    }

    record.status = "approved";
    record.approvedBy = userId;
    record.approvedAt = new Date();
    await record.save();

    const updated = await PayrollRecordModel.findById(id)
      .populate("userId", "name email employeeId")
      .populate("approvedBy", "name email")
      .lean();

    // Gửi thông báo cho nhân viên về việc bảng lương đã được duyệt
    try {
      const { NotificationService } = await import("../notifications/notification.service.js");
      await NotificationService.createAndEmitNotification({
        userId: updated.userId?._id || record.userId,
        type: "system",
        title: "Bảng lương đã được duyệt",
        message: `Bảng lương tháng ${updated.month || record.month} của bạn đã được duyệt.`,
        relatedEntityType: "payroll",
        relatedEntityId: updated._id,
        metadata: {
          month: updated.month || record.month,
          status: "approved",
        },
      });
    } catch (notifError) {
      console.error("[payroll] approve notification error", notifError);
    }

    // Emit real-time payroll update
    try {
      const payrollData = {
        _id: updated._id.toString(),
        userId: updated.userId?._id?.toString() || record.userId?.toString(),
        month: updated.month || record.month,
        status: "approved",
        action: "approved",
      };
      if (payrollData.userId) {
        emitPayrollUpdate(payrollData.userId, payrollData);
      }
    } catch (socketError) {
      console.error("[payroll] Error emitting approve update:", socketError);
    }

    res.json({ data: updated });
  } catch (error) {
    console.error("[payroll] approve record error", error);
    res.status(500).json({ message: "Không thể duyệt bảng lương" });
  }
};

/**
 * Mark payroll as paid
 */
export const markPayrollAsPaid = async (req, res) => {
  try {
    const { PayrollRecordModel } = await import("./payroll.model.js");
    const { id } = req.params;

    const record = await PayrollRecordModel.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Không tìm thấy bảng lương" });
    }

    if (record.status !== "approved") {
      return res
        .status(400)
        .json({ message: "Bảng lương phải được duyệt trước khi thanh toán" });
    }

    record.status = "paid";
    record.paidAt = new Date();
    await record.save();

    const updated = await PayrollRecordModel.findById(id)
      .populate("userId", "name email employeeId")
      .populate("approvedBy", "name email")
      .lean();

    // Gửi thông báo đã thanh toán bảng lương
    try {
      const { NotificationService } = await import("../notifications/notification.service.js");
      await NotificationService.createAndEmitNotification({
        userId: updated.userId?._id || record.userId,
        type: "system",
        title: "Bảng lương đã được thanh toán",
        message: `Bảng lương tháng ${updated.month || record.month} của bạn đã được thanh toán.`,
        relatedEntityType: "payroll",
        relatedEntityId: updated._id,
        metadata: {
          month: updated.month || record.month,
          status: "paid",
        },
      });
    } catch (notifError) {
      console.error("[payroll] paid notification error", notifError);
    }

    // Emit real-time payroll update
    try {
      const payrollData = {
        _id: updated._id.toString(),
        userId: updated.userId?._id?.toString() || record.userId?.toString(),
        month: updated.month || record.month,
        status: "paid",
        action: "paid",
      };
      if (payrollData.userId) {
        emitPayrollUpdate(payrollData.userId, payrollData);
      }
    } catch (socketError) {
      console.error("[payroll] Error emitting paid update:", socketError);
    }

    res.json({ data: updated });
  } catch (error) {
    console.error("[payroll] mark as paid error", error);
    res.status(500).json({ message: "Không thể cập nhật trạng thái thanh toán" });
  }
};

/**
 * POST /payroll/generate — HR/Admin generate payroll cho 1 tháng (toàn bộ NV hoặc 1 NV)
 */
export const generatePayroll = async (req, res) => {
  try {
    const { month, userId, departmentId } = req.body || {};
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "month phải có format YYYY-MM" });
    }
    const companyId = req.user?.companyId;

    // Single user
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "userId không hợp lệ" });
      }
      const record = await generatePayrollRecord(userId, month);
      return res.json({ success: true, processed: 1, successCount: 1, errorCount: 0, errors: [], record });
    }

    // Department scope
    if (departmentId) {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({ message: "departmentId không hợp lệ" });
      }
      const { UserModel } = await import("../users/user.model.js");
      const deptQuery = {
        department: departmentId,
        role: { $in: ["EMPLOYEE", "MANAGER"] },
        isActive: true,
        isTrial: { $ne: true },
      };
      if (companyId) deptQuery.companyId = companyId;
      const employees = await UserModel.find(deptQuery).select("_id name").lean();

      const results = { success: [], errors: [], processed: 0 };
      for (const emp of employees) {
        try {
          const record = await generatePayrollRecord(emp._id.toString(), month);
          results.success.push({ userId: emp._id.toString(), name: emp.name, recordId: record._id.toString() });
          results.processed++;
        } catch (err) {
          results.errors.push({ userId: emp._id.toString(), name: emp.name, error: err.message });
        }
      }
      return res.json({
        success: true,
        processed: results.processed,
        successCount: results.success.length,
        errorCount: results.errors.length,
        errors: results.errors,
      });
    }

    // All users
    const results = await generatePayrollForMonth(month, companyId);
    return res.json({
      success: true,
      processed: results.processed,
      successCount: results.success.length,
      errorCount: results.errors.length,
      errors: results.errors,
    });
  } catch (error) {
    console.error("[payroll] generate error", error);
    return res.status(500).json({ message: error.message || "Không thể tạo bảng lương" });
  }
};

/**
 * GET /payroll/my-payslip — Employee xem phiếu lương của chính mình
 * Query: month (YYYY-MM, mặc định tháng trước)
 */
export const getMyPayslip = async (req, res) => {
  try {
    const { PayrollRecordModel } = await import("./payroll.model.js");
    const userId = resolveRequestUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let { month } = req.query;
    if (month === "all") {
      const records = await PayrollRecordModel.find({ userId })
        .populate("userId", "name email employeeId department position")
        .populate("approvedBy", "name email")
        .sort({ month: -1 })
        .lean();
      return res.json({ data: records });
    }

    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "month phải có format YYYY-MM" });
    }

    if (!month) {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    const record = await PayrollRecordModel.findOne({ userId, month })
      .populate("userId", "name email employeeId department position")
      .populate("approvedBy", "name email")
      .lean();

    if (!record) {
      return res.status(404).json({ message: `Chưa có phiếu lương tháng ${month}` });
    }

    return res.json({ data: record });
  } catch (error) {
    console.error("[payroll] my-payslip error", error);
    return res.status(500).json({ message: "Không lấy được phiếu lương" });
  }
};

const formatVND = (n) => {
  const value = Number.isFinite(n) ? n : 0;
  return Math.round(value).toLocaleString("vi-VN") + " ₫";
};

const loadOwnPayslipOrFail = async (req, res) => {
  const { PayrollRecordModel } = await import("./payroll.model.js");
  const userId = resolveRequestUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  let { month } = req.query;
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ message: "month phải có format YYYY-MM" });
    return null;
  }

  if (!month) {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  const record = await PayrollRecordModel.findOne({ userId, month })
    .populate("userId", "name email employeeId department position")
    .lean();

  if (!record) {
    res.status(404).json({ message: `Chưa có phiếu lương tháng ${month}` });
    return null;
  }
  return { record, month };
};

import { createReadStream, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const _dir = dirname(fileURLToPath(import.meta.url));
const FONT_PATH = join(_dir, "../../../assets/fonts/NotoSans-Regular.ttf");

/**
 * GET /payroll/my-payslip/pdf — xuất phiếu lương cá nhân ra PDF
 */
export const exportMyPayslipPdf = async (req, res) => {
  try {
    const data = await loadOwnPayslipOrFail(req, res);
    if (!data) return;
    const { record, month } = data;

    const PDFKit = (await import("pdfkit")).default;
    const u = record.userId || {};
    const hasFont = existsSync(FONT_PATH);

    const doc = new PDFKit({ size: "A4", margin: 50 });

    if (hasFont) {
      doc.registerFont("NotoSans", FONT_PATH);
      doc.registerFont("NotoSans-Bold", FONT_PATH);
    }
    const font = (bold = false) => hasFont ? (bold ? "NotoSans-Bold" : "NotoSans") : (bold ? "Helvetica-Bold" : "Helvetica");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="payslip-${month}.pdf"`);
    doc.pipe(res);

    const W = 595 - 100; // usable width (A4 595pt - 2*50 margin)

    // ── Header ───────────────────────────────────────────────────────────────
    doc.font(font(true)).fontSize(20).fillColor("#1e40af").text("PHIẾU LƯƠNG", { align: "center" });
    doc.font(font()).fontSize(11).fillColor("#64748b").text(`Kỳ lương: Tháng ${month}`, { align: "center" });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#1e40af").lineWidth(2).stroke();
    doc.moveDown(0.8);

    // ── Employee info ─────────────────────────────────────────────────────────
    doc.font(font(true)).fontSize(12).fillColor("#1e293b").text("THÔNG TIN NHÂN VIÊN");
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();
    doc.moveDown(0.4);

    const infoRows = [
      ["Họ và tên", u.name || "-"],
      ["Email", u.email || "-"],
      ["Mã nhân viên", u.employeeId || record.employeeId || "-"],
      ["Phòng ban", record.department || "-"],
      ["Chức vụ", record.position || u.position || "-"],
    ];
    const col1 = 50, col2 = 220;
    infoRows.forEach(([label, value]) => {
      doc.font(font()).fontSize(10).fillColor("#64748b").text(label, col1, doc.y, { width: 160, continued: false });
      doc.font(font(true)).fontSize(10).fillColor("#1e293b").text(value, col2, doc.y - doc.currentLineHeight(), { width: W - 170 });
      doc.moveDown(0.4);
    });

    doc.moveDown(0.5);

    // ── Attendance summary ────────────────────────────────────────────────────
    doc.font(font(true)).fontSize(12).fillColor("#1e293b").text("TỔNG HỢP CHẤM CÔNG");
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();
    doc.moveDown(0.4);

    const attendRows = [
      ["Ngày công thực tế", `${sanitizeNumber(record.workDays)} ngày`],
      ["Giờ tăng ca", `${sanitizeNumber(record.overtimeHours)} giờ`],
      ["Ngày nghỉ phép", `${sanitizeNumber(record.leaveDays)} ngày`],
      ["Ngày đi muộn / về sớm", `${sanitizeNumber(record.lateDays)} ngày`],
    ];
    attendRows.forEach(([label, value]) => {
      doc.font(font()).fontSize(10).fillColor("#64748b").text(label, col1, doc.y, { width: 160 });
      doc.font(font()).fontSize(10).fillColor("#334155").text(value, col2, doc.y - doc.currentLineHeight(), { width: W - 170 });
      doc.moveDown(0.4);
    });

    doc.moveDown(0.5);

    // ── Salary breakdown table ────────────────────────────────────────────────
    doc.font(font(true)).fontSize(12).fillColor("#1e293b").text("CHI TIẾT LƯƠNG");
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();
    doc.moveDown(0.4);

    const salaryRows = [
      ["Lương cơ bản", sanitizeNumber(record.baseSalary), false],
      ["Lương thực tế theo công", sanitizeNumber(record.actualBaseSalary), false],
      ["Lương tăng ca", sanitizeNumber(record.overtimePay), false],
      ["Thưởng", sanitizeNumber(record.bonus), false],
      ["Khấu trừ bảo hiểm", -sanitizeNumber(record.insuranceDeduction), true],
      ["Khấu trừ thuế TNCN", -sanitizeNumber(record.taxDeduction), true],
      ["Khấu trừ khác", -sanitizeNumber(record.deductions), true],
    ];

    const colAmt = 380;
    salaryRows.forEach(([label, amount, isDeduction]) => {
      const color = isDeduction ? "#ef4444" : "#1e293b";
      const sign = isDeduction ? "-" : "";
      const absAmt = Math.abs(amount);
      doc.font(font()).fontSize(10).fillColor("#64748b").text(label, col1, doc.y, { width: 320 });
      doc.font(font()).fontSize(10).fillColor(color).text(
        `${sign}${Math.round(absAmt).toLocaleString("vi-VN")} ₫`,
        colAmt, doc.y - doc.currentLineHeight(),
        { width: 115, align: "right" }
      );
      doc.moveDown(0.5);
    });

    // Total line
    doc.moveDown(0.2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#1e40af").lineWidth(1.5).stroke();
    doc.moveDown(0.4);
    doc.font(font(true)).fontSize(13).fillColor("#1e40af").text("THỰC LĨNH", col1, doc.y);
    doc.font(font(true)).fontSize(13).fillColor("#1e40af").text(
      formatVND(record.totalSalary),
      colAmt, doc.y - doc.currentLineHeight(),
      { width: 115, align: "right" }
    );
    doc.moveDown(1.5);

    // ── Status + footer ───────────────────────────────────────────────────────
    const statusColor = record.status === "paid" ? "#16a34a" : record.status === "approved" ? "#2563eb" : "#94a3b8";
    doc.font(font()).fontSize(10).fillColor(statusColor)
      .text(`Trạng thái: ${record.status?.toUpperCase() || "PENDING"}`, { align: "center" });

    doc.moveDown(2);
    doc.font(font()).fontSize(9).fillColor("#94a3b8")
      .text(`Phiếu lương được tạo tự động bởi hệ thống SmartAttendance — ${new Date().toLocaleDateString("vi-VN")}`, { align: "center" });

    doc.end();
  } catch (error) {
    console.error("[payroll] export pdf error", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Không xuất được PDF" });
    }
  }
};

/**
 * GET /payroll/my-payslip/excel — xuất phiếu lương cá nhân ra Excel (ExcelJS)
 */
export const exportMyPayslipExcel = async (req, res) => {
  try {
    const data = await loadOwnPayslipOrFail(req, res);
    if (!data) return;
    const { record, month } = data;

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "SmartAttendance";
    wb.created = new Date();
    const ws = wb.addWorksheet("Phiếu Lương");

    const u = record.userId || {};

    // Column widths
    ws.columns = [
      { key: "label", width: 32 },
      { key: "value", width: 22 },
    ];

    const addTitle = (text) => {
      const row = ws.addRow([text]);
      row.getCell(1).font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
      ws.mergeCells(`A${row.number}:B${row.number}`);
      row.getCell(1).alignment = { horizontal: "center" };
      row.height = 24;
    };

    const addSubheader = (text) => {
      ws.addRow([]);
      const row = ws.addRow([text]);
      row.getCell(1).font = { bold: true, size: 11, color: { argb: "FF1E293B" } };
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      ws.mergeCells(`A${row.number}:B${row.number}`);
      row.height = 20;
    };

    const addInfoRow = (label, value) => {
      const row = ws.addRow([label, value]);
      row.getCell(1).font = { color: { argb: "FF64748B" }, size: 10 };
      row.getCell(2).font = { bold: true, size: 10 };
      row.height = 18;
    };

    const addSalaryRow = (label, amount, isDeduction = false) => {
      const row = ws.addRow([label, amount]);
      row.getCell(1).font = { color: { argb: "FF64748B" }, size: 10 };
      row.getCell(2).font = { size: 10, color: { argb: isDeduction ? "FFEF4444" : "FF1E293B" } };
      row.getCell(2).numFmt = '#,##0 [$₫-vi-VN]';
      row.getCell(2).alignment = { horizontal: "right" };
      row.height = 18;
    };

    // Header
    addTitle("PHIẾU LƯƠNG");
    addTitle(`Kỳ lương: Tháng ${month}`);

    // Employee info
    addSubheader("THÔNG TIN NHÂN VIÊN");
    addInfoRow("Họ và tên", u.name || "-");
    addInfoRow("Email", u.email || "-");
    addInfoRow("Mã nhân viên", u.employeeId || record.employeeId || "-");
    addInfoRow("Phòng ban", record.department || "-");
    addInfoRow("Chức vụ", record.position || u.position || "-");

    // Attendance
    addSubheader("TỔNG HỢP CHẤM CÔNG");
    addInfoRow("Ngày công thực tế", `${sanitizeNumber(record.workDays)} ngày`);
    addInfoRow("Giờ tăng ca", `${sanitizeNumber(record.overtimeHours)} giờ`);
    addInfoRow("Ngày nghỉ phép", `${sanitizeNumber(record.leaveDays)} ngày`);
    addInfoRow("Ngày đi muộn / về sớm", `${sanitizeNumber(record.lateDays)} ngày`);

    // Salary
    addSubheader("CHI TIẾT LƯƠNG");
    addSalaryRow("Lương cơ bản", sanitizeNumber(record.baseSalary));
    addSalaryRow("Lương thực tế theo công", sanitizeNumber(record.actualBaseSalary));
    addSalaryRow("Lương tăng ca", sanitizeNumber(record.overtimePay));
    addSalaryRow("Thưởng", sanitizeNumber(record.bonus));
    addSalaryRow("Khấu trừ bảo hiểm", -sanitizeNumber(record.insuranceDeduction), true);
    addSalaryRow("Khấu trừ thuế TNCN", -sanitizeNumber(record.taxDeduction), true);
    addSalaryRow("Khấu trừ khác", -sanitizeNumber(record.deductions), true);

    // Total
    ws.addRow([]);
    const totalRow = ws.addRow(["THỰC LĨNH", sanitizeNumber(record.totalSalary)]);
    totalRow.getCell(1).font = { bold: true, size: 12, color: { argb: "FF1E40AF" } };
    totalRow.getCell(2).font = { bold: true, size: 12, color: { argb: "FF1E40AF" } };
    totalRow.getCell(2).numFmt = '#,##0 [$₫-vi-VN]';
    totalRow.getCell(2).alignment = { horizontal: "right" };
    totalRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
    totalRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
    totalRow.height = 22;

    ws.addRow([]);
    const statusRow = ws.addRow([`Trạng thái: ${record.status?.toUpperCase() || "PENDING"}`]);
    ws.mergeCells(`A${statusRow.number}:B${statusRow.number}`);

    // Add borders to all data rows
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="payslip-${month}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("[payroll] export excel error", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Không xuất được Excel" });
    }
  }
};

/**
 * GET /payroll/export/excel — HR/Admin xuất toàn bộ bảng lương tháng ra Excel
 */
export const exportPayrollBulkExcel = async (req, res) => {
  try {
    const { PayrollRecordModel } = await import("./payroll.model.js");
    let { month } = req.query;
    if (!month) {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "month phải có format YYYY-MM" });
    }

    const companyId = req.user?.companyId;
    const bulkQuery = { month };
    if (companyId) bulkQuery.companyId = companyId;
    const records = await PayrollRecordModel.find(bulkQuery)
      .populate("userId", "name email employeeId department position")
      .lean();

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "SmartAttendance";
    wb.created = new Date();
    const ws = wb.addWorksheet(`Bảng Lương ${month}`);

    const headers = [
      "STT", "Mã NV", "Họ và tên", "Email", "Phòng ban", "Chức vụ",
      "Ngày công", "Giờ tăng ca", "Lương cơ bản", "Lương theo công",
      "Tăng ca", "Thưởng", "Bảo hiểm", "Thuế TNCN", "Khấu trừ khác", "Thực lĩnh", "Trạng thái",
    ];

    ws.columns = [
      { key: "stt", width: 5 },
      { key: "employeeId", width: 12 },
      { key: "name", width: 22 },
      { key: "email", width: 26 },
      { key: "department", width: 18 },
      { key: "position", width: 16 },
      { key: "workDays", width: 10 },
      { key: "overtimeHours", width: 12 },
      { key: "baseSalary", width: 16 },
      { key: "actualBaseSalary", width: 16 },
      { key: "overtimePay", width: 14 },
      { key: "bonus", width: 12 },
      { key: "insuranceDeduction", width: 14 },
      { key: "taxDeduction", width: 14 },
      { key: "deductions", width: 14 },
      { key: "totalSalary", width: 16 },
      { key: "status", width: 12 },
    ];

    // Header row
    const headerRow = ws.addRow(headers);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFFFFFFF" } },
        bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
        left: { style: "thin", color: { argb: "FFFFFFFF" } },
        right: { style: "thin", color: { argb: "FFFFFFFF" } },
      };
    });

    const currencyCols = [9, 10, 11, 12, 13, 14, 15, 16];

    records.forEach((rec, idx) => {
      const u = rec.userId || {};
      const row = ws.addRow([
        idx + 1,
        u.employeeId || rec.employeeId || "-",
        u.name || "-",
        u.email || "-",
        rec.department || u.department || "-",
        rec.position || u.position || "-",
        sanitizeNumber(rec.workDays),
        sanitizeNumber(rec.overtimeHours),
        sanitizeNumber(rec.baseSalary),
        sanitizeNumber(rec.actualBaseSalary),
        sanitizeNumber(rec.overtimePay),
        sanitizeNumber(rec.bonus),
        -sanitizeNumber(rec.insuranceDeduction),
        -sanitizeNumber(rec.taxDeduction),
        -sanitizeNumber(rec.deductions),
        sanitizeNumber(rec.totalSalary),
        rec.status || "pending",
      ]);

      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        if (isEven) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (currencyCols.includes(colNum)) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: "right" };
        }
      });

      // Highlight total salary cell
      const totalCell = row.getCell(16);
      totalCell.font = { bold: true, color: { argb: "FF1E40AF" } };
    });

    // Summary row
    ws.addRow([]);
    const sumRow = ws.addRow([
      "", "", "", "", "", "TỔNG CỘNG",
      { formula: `SUM(G2:G${records.length + 1})` },
      "",
      { formula: `SUM(I2:I${records.length + 1})` },
      { formula: `SUM(J2:J${records.length + 1})` },
      { formula: `SUM(K2:K${records.length + 1})` },
      { formula: `SUM(L2:L${records.length + 1})` },
      { formula: `SUM(M2:M${records.length + 1})` },
      { formula: `SUM(N2:N${records.length + 1})` },
      { formula: `SUM(O2:O${records.length + 1})` },
      { formula: `SUM(P2:P${records.length + 1})` },
    ]);
    sumRow.eachCell((cell, colNum) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
      if (currencyCols.includes(colNum)) cell.numFmt = '#,##0';
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="payroll-${month}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("[payroll] bulk export error", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Không xuất được file Excel" });
    }
  }
};

/**
 * Get unique departments from payroll records
 */
export const getDepartments = async (req, res) => {
  try {
    const { DepartmentModel } = await import("../departments/department.model.js");
    const companyId = resolveTenantCompanyId(req) ?? req.user?.companyId ?? null;

    const query = { status: "active" };
    if (companyId) query.companyId = companyId;

    const departments = await DepartmentModel.find(query)
      .select("name")
      .sort({ name: 1 })
      .lean();

    res.json({
      departments: departments.map((d) => d.name).filter(Boolean),
    });
  } catch (error) {
    console.error("[payroll] get departments error", error);
    res.status(500).json({ message: "Không lấy được danh sách phòng ban" });
  }
};

/**
 * Get departments list with ID (for Generate dialog)
 * GET /api/payroll/meta/departments-with-id
 */
export const getDepartmentsWithId = async (req, res) => {
  try {
    const { DepartmentModel } = await import("../departments/department.model.js");
    const { resolveTenantCompanyId } = await import("../../utils/tenantCompany.util.js");
    const companyId = resolveTenantCompanyId(req) ?? req.user?.companyId;

    const query = { status: "active" };
    if (companyId) query.companyId = companyId;

    const departments = await DepartmentModel.find(query)
      .select("_id name code")
      .sort({ name: 1 })
      .lean();
    res.json({ departments });
  } catch (error) {
    console.error("[payroll] get departments-with-id error", error);
    res.status(500).json({ message: "Không lấy được danh sách phòng ban" });
  }
};

/**
 * Get unique positions from users
 */
export const getPositions = async (req, res) => {
  try {
    const { UserModel } = await import("../users/user.model.js");
    const { SalaryMatrixModel } = await import("./salary-matrix.model.js");
    const { resolveTenantCompanyId } = await import("../../utils/tenantCompany.util.js");
    const companyId = resolveTenantCompanyId(req) ?? req.user?.companyId;

    // Get unique positions from active users
    const positionFilter = {
      position: { $exists: true, $nin: [null, ""] },
      isActive: true,
    };
    if (companyId) positionFilter.companyId = companyId;
    const userPositions = await UserModel.distinct("position", positionFilter);

    const matrixFilter = { isActive: true };
    if (companyId) matrixFilter.companyId = companyId;
    const matrixPositions = await SalaryMatrixModel.distinct("position", matrixFilter);

    // Filter out null/empty values and sort
    const validPositions = [...new Set([...userPositions, ...matrixPositions])]
      .filter((pos) => pos && pos.trim() !== "")
      .sort((a, b) => a.localeCompare(b, "vi"));

    res.json({ positions: validPositions });
  } catch (error) {
    console.error("[payroll] get positions error", error);
    res.status(500).json({ message: "Không lấy được danh sách chức vụ" });
  }
};

/**
 * Preview payroll for a user/month without writing to DB
 * GET /api/payroll/preview?userId=xxx&month=YYYY-MM
 */
export const previewPayroll = async (req, res) => {
  try {
    const { z } = await import("zod");
    const schema = z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "userId không hợp lệ"),
      month: z.string().regex(/^\d{4}-\d{2}$/, "month phải có định dạng YYYY-MM"),
    });
    const parse = schema.safeParse(req.query);
    if (!parse.success) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: parse.error.flatten(),
      });
    }

    const { userId, month } = parse.data;

    const requestorRole = req.user?.role;
    if (requestorRole !== "SUPER_ADMIN") {
      const { UserModel } = await import("../users/user.model.js");
      const requestorId = req.user?.userId ?? req.user?.userContext?.userId;
      const [requestor, target] = await Promise.all([
        UserModel.findById(requestorId).select("role companyId").lean(),
        UserModel.findById(userId).select("role companyId").lean(),
      ]);
      if (!target) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      if (!canAccessUserTenant(requestor, target)) {
        return res.status(403).json({ message: "Không có quyền xem bảng lương này" });
      }
    }

    const preview = await previewPayrollRecord(userId, month);
    res.json({ data: preview });
  } catch (error) {
    console.error("[payroll] preview error", error);
    const status = error.message?.includes("not found") ? 404 : 500;
    res.status(status).json({ message: error.message || "Không thể xem trước bảng lương" });
  }
};