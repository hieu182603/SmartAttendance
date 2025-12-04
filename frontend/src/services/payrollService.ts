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
  page?: number;
  limit?: number;
  status?: string;
  department?: string;
}

export interface PayrollRecord {
  _id: string;
  userId: {
    _id: string;
    name: string;
    employeeId: string;
  };
  month: string;
  periodStart: string;
  periodEnd: string;
  workDays: number;
  totalDays: number;
  overtimeHours: number;
  leaveDays: number;
  lateDays: number;
  baseSalary: number;
  overtimePay: number;
  bonus: number;
  deductions: number;
  totalSalary: number;
  status: "pending" | "approved" | "paid";
  department: string;
  position: string;
  employeeId: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollListResponse {
  records: PayrollRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getPayrollReports = async (
  params: PayrollParams = {}
): Promise<PayrollReportResponse> => {
  const { data } = await api.get("/payroll/reports", { params });
  return data as PayrollReportResponse;
};

export const getPayrollRecords = async (
  params: PayrollParams = {}
): Promise<PayrollListResponse> => {
  const { data } = await api.get("/payroll", { params });
  return data;
};

export const getPayrollById = async (id: string): Promise<PayrollRecord> => {
  const { data } = await api.get(`/payroll/${id}`);
  return data.data;
};

export const approvePayroll = async (id: string): Promise<PayrollRecord> => {
  const { data } = await api.put(`/payroll/${id}/approve`);
  return data.data;
};

export const markAsPaid = async (id: string): Promise<PayrollRecord> => {
  const { data } = await api.put(`/payroll/${id}/pay`);
  return data.data;
};

export const getDepartments = async (): Promise<string[]> => {
  const { data } = await api.get("/payroll/meta/departments");
  return data.departments || [];
};

