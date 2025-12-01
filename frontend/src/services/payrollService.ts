import api from "@/services/api";

export interface PayrollSummary {
  month: string;
  totalEmployees: number;
  totalSalary: number;
  totalBonuses: number;
  totalDeductions: number;
  netPay: number;
  avgSalary: number;
}

export interface DepartmentPayroll {
  department: string;
  employees: number;
  totalSalary: number;
  avgSalary: number;
  percentage: number;
}

export interface MonthlyTrendPoint {
  month: string;
  total: number;
  employees: number;
}

export interface PayrollReportResponse {
  summary: PayrollSummary[];
  departments: DepartmentPayroll[];
  monthlyTrend: MonthlyTrendPoint[];
}

interface PayrollParams {
  month?: string;
  limit?: number;
}

export const getPayrollReports = async (
  params: PayrollParams = {}
): Promise<PayrollReportResponse> => {
  const { data } = await api.get("/payroll/reports", { params });
  return data as PayrollReportResponse;
};

