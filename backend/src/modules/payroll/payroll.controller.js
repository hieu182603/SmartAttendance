import { PayrollReportModel } from "./payroll.model.js";

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
    if (department) query.department = department;

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

    res.json({ data: updated });
  } catch (error) {
    console.error("[payroll] mark as paid error", error);
    res.status(500).json({ message: "Không thể cập nhật trạng thái thanh toán" });
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
