import mongoose from "mongoose";
import { PayrollReportModel } from "./payroll.model.js";
import { emitPayrollUpdate } from "../../config/socket.js";
import { generatePayrollForMonth, generatePayrollRecord, previewPayrollRecord } from "./payroll.service.js";

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

export const getPayrollReports = async (req, res) => {
  try {
    const { month, limit = 6 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 24);

    const reports = await PayrollReportModel.find({})
      .sort({ periodStart: -1 })
      .limit(limitNum)
      .lean();

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

    // Build query
    const query = {};
    if (month) query.month = month;
    if (status) query.status = status;
    // Support both departmentId (ObjectId) and department name filtering
    if (department) {
      // Try to match as departmentId first (if it's a valid ObjectId)
      if (mongoose.Types.ObjectId.isValid(department)) {
        query.departmentId = department;
      } else {
        // Otherwise filter by department name
        query.department = department;
      }
    }

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
      const employees = await UserModel.find({
        department: departmentId,
        role: { $in: ["EMPLOYEE", "MANAGER", "SUPERVISOR"] },
        isActive: true,
        isTrial: { $ne: true },
      }).select("_id name").lean();

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
    const results = await generatePayrollForMonth(month);
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
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let { month } = req.query;
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
  const userId = req.user?.userId;
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

/**
 * GET /payroll/my-payslip/pdf — xuất phiếu lương cá nhân ra PDF
 */
export const exportMyPayslipPdf = async (req, res) => {
  try {
    const data = await loadOwnPayslipOrFail(req, res);
    if (!data) return;
    const { record, month } = data;

    const PDFKit = (await import("pdfkit")).default;
    const doc = new PDFKit({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payslip-${month}.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(18).text("PHIEU LUONG", { align: "center" });
    doc.fontSize(12).text(`Thang: ${month}`, { align: "center" });
    doc.moveDown();

    const u = record.userId || {};
    doc.fontSize(11).text(`Ho ten: ${u.name || "-"}`);
    doc.text(`Email: ${u.email || "-"}`);
    doc.text(`Ma NV: ${u.employeeId || record.employeeId || "-"}`);
    doc.text(`Phong ban: ${record.department || "-"}`);
    doc.text(`Chuc vu: ${record.position || u.position || "-"}`);
    doc.moveDown();

    const rows = [
      ["Ngay cong thuc te", record.workDays],
      ["Gio tang ca", record.overtimeHours],
      ["Ngay nghi phep", record.leaveDays],
      ["Ngay di muon", record.lateDays],
      ["Luong co ban", formatVND(record.baseSalary)],
      ["Luong thuc te theo cong", formatVND(record.actualBaseSalary)],
      ["Luong tang ca", formatVND(record.overtimePay)],
      ["Thuong", formatVND(record.bonus)],
      ["Khau tru", formatVND(record.deductions)],
    ];

    rows.forEach(([k, v]) => doc.text(`${k}: ${v}`));
    doc.moveDown();
    doc.fontSize(13).text(`TONG LUONG: ${formatVND(record.totalSalary)}`, {
      underline: true,
    });
    doc.moveDown();
    doc.fontSize(10).fillColor("gray").text(`Trang thai: ${record.status}`);

    doc.end();
  } catch (error) {
    console.error("[payroll] export pdf error", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Không xuất được PDF" });
    }
  }
};

/**
 * GET /payroll/my-payslip/excel — xuất phiếu lương cá nhân ra Excel
 */
export const exportMyPayslipExcel = async (req, res) => {
  try {
    const data = await loadOwnPayslipOrFail(req, res);
    if (!data) return;
    const { record, month } = data;

    const xlsx = await import("xlsx");
    const u = record.userId || {};

    const sheetData = [
      ["PHIEU LUONG"],
      [`Thang: ${month}`],
      [],
      ["Ho ten", u.name || "-"],
      ["Email", u.email || "-"],
      ["Ma NV", u.employeeId || record.employeeId || "-"],
      ["Phong ban", record.department || "-"],
      ["Chuc vu", record.position || u.position || "-"],
      [],
      ["Hang muc", "Gia tri"],
      ["Ngay cong thuc te", record.workDays],
      ["Gio tang ca", record.overtimeHours],
      ["Ngay nghi phep", record.leaveDays],
      ["Ngay di muon", record.lateDays],
      ["Luong co ban", record.baseSalary],
      ["Luong thuc te theo cong", record.actualBaseSalary],
      ["Luong tang ca", record.overtimePay],
      ["Thuong", record.bonus],
      ["Khau tru", record.deductions],
      ["TONG LUONG", record.totalSalary],
      [],
      ["Trang thai", record.status],
    ];

    const ws = xlsx.utils.aoa_to_sheet(sheetData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Payslip");

    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payslip-${month}.xlsx"`
    );
    res.send(buf);
  } catch (error) {
    console.error("[payroll] export excel error", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Không xuất được Excel" });
    }
  }
};

/**
 * Get unique departments from payroll records
 */
export const getDepartments = async (req, res) => {
  try {
    const { PayrollRecordModel } = await import("./payroll.model.js");
    
    // Get unique departments
    const departments = await PayrollRecordModel.distinct("department");
    
    // Filter out null/empty values and sort
    const validDepartments = departments
      .filter((dept) => dept && dept.trim() !== "")
      .sort();

    res.json({ departments: validDepartments });
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
    const departments = await DepartmentModel.find({ isActive: true })
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
    
    // Get unique positions from active users
    const positions = await UserModel.distinct("position", {
      position: { $exists: true, $nin: [null, ""] },
      isActive: true,
    });
    
    // Filter out null/empty values and sort
    const validPositions = positions
      .filter((pos) => pos && pos.trim() !== "")
      .sort();

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

    // HR_MANAGER chỉ được preview nhân viên cùng phòng ban
    const requestorRole = req.user?.role;
    if (requestorRole !== "ADMIN" && requestorRole !== "SUPER_ADMIN") {
      const { UserModel } = await import("../users/user.model.js");
      const [requestor, target] = await Promise.all([
        UserModel.findById(req.user?.userId).select("department").lean(),
        UserModel.findById(userId).select("department").lean(),
      ]);
      if (!target) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      if (requestor?.department?.toString() !== target?.department?.toString()) {
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