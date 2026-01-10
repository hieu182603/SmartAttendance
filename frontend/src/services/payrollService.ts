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

export const getPositions = async (): Promise<string[]> => {
  const { data } = await api.get("/payroll/meta/positions");
  return data.positions || [];
};

// ============================================================================
// Salary Matrix Management
// ============================================================================

export interface SalaryMatrix {
  _id: string;
  departmentCode: string;
  position: string;
  baseSalary: number;
  notes?: string;
  isActive: boolean;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface SalaryMatrixParams {
  departmentCode?: string;
  position?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface SalaryMatrixListResponse {
  records: SalaryMatrix[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateSalaryMatrixPayload {
  departmentCode: string;
  position: string;
  baseSalary: number;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateSalaryMatrixPayload {
  baseSalary?: number;
  notes?: string;
  isActive?: boolean;
}

export const getSalaryMatrix = async (
  params: SalaryMatrixParams = {}
): Promise<SalaryMatrixListResponse> => {
  const { data } = await api.get("/payroll/salary-matrix", { params });
  return data;
};

export const getSalaryMatrixById = async (id: string): Promise<SalaryMatrix> => {
  const { data } = await api.get(`/payroll/salary-matrix/${id}`);
  return data.data;
};

export const createSalaryMatrix = async (
  payload: CreateSalaryMatrixPayload
): Promise<SalaryMatrix> => {
  const { data } = await api.post("/payroll/salary-matrix", payload);
  return data.data;
};

export const updateSalaryMatrix = async (
  id: string,
  payload: UpdateSalaryMatrixPayload
): Promise<SalaryMatrix> => {
  const { data } = await api.put(`/payroll/salary-matrix/${id}`, payload);
  return data.data;
};

export const deleteSalaryMatrix = async (id: string): Promise<void> => {
  await api.delete(`/payroll/salary-matrix/${id}`);
};

// ============================================================================
// User Base Salary Management
// ============================================================================

export interface UserSalaryInfo {
  userId: string;
  name: string;
  department: string | null;
  departmentCode: string | null;
  position: string | null;
  baseSalary: number | null;
  matrixSalary: number | null;
  calculatedSalary: number;
  source: "USER_BASE_SALARY" | "SALARY_MATRIX" | "DEFAULT_CONFIG";
}

export interface UpdateUserBaseSalaryPayload {
  baseSalary: number | null;
}

export const getUserSalaryInfo = async (userId: string): Promise<UserSalaryInfo> => {
  const { data } = await api.get(`/payroll/users/${userId}/salary-info`);
  return data.data;
};

export const updateUserBaseSalary = async (
  userId: string,
  payload: UpdateUserBaseSalaryPayload
): Promise<{ _id: string; name: string; baseSalary: number | null }> => {
  const { data } = await api.put(`/payroll/users/${userId}/base-salary`, payload);
  return data.data;
};

