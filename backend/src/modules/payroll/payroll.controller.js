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

