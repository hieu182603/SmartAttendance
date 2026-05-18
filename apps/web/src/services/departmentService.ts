import api from '@/services/api'

export interface Department {
  _id: string
  id?: string
  name: string
  code: string
  description?: string
  branchId: string | {
    _id: string
    name: string
    code: string
  } | null
  branchName?: string
  managerId?: string | {
    _id: string
    name: string
    email: string
  } | null
  managerName?: string
  budget: number
  status: 'active' | 'inactive'
  createdAt?: string
  employeeCount?: number
  activeEmployees?: number
}

export interface DepartmentStats {
  total: number
  totalEmployees: number
  activeEmployees: number
  totalBudget: number
}

export interface DepartmentsResponse {
  departments: Department[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const getAllDepartments = async (params: {
  page?: number
  limit?: number
  search?: string
  branchId?: string
  status?: string
} = {}): Promise<DepartmentsResponse> => {
  try {
    const { data } = await api.get('/departments', { params })
    return data
  } catch (error) {
    console.error('[departmentService] getAllDepartments error:', error)
    throw error
  }
}

export const getDepartmentStats = async (): Promise<DepartmentStats> => {
  try {
    const { data } = await api.get('/departments/stats')
    return data
  } catch (error) {
    console.error('[departmentService] getDepartmentStats error:', error)
    throw error
  }
}

export const getDepartmentById = async (id: string): Promise<{ department: Department }> => {
  try {
    const { data } = await api.get(`/departments/${id}`)
    return data
  } catch (error) {
    console.error('[departmentService] getDepartmentById error:', error)
    throw error
  }
}

export const createDepartment = async (departmentData: {
  name: string
  code: string
  description?: string
  branchId: string
  managerId: string
  budget?: number
}): Promise<{ department: Department; message: string }> => {
  try {
    const { data } = await api.post('/departments', departmentData)
    return data
  } catch (error) {
    console.error('[departmentService] createDepartment error:', error)
    throw error
  }
}

export const updateDepartment = async (
  id: string,
  departmentData: Partial<{
    name: string
    code: string
    description: string
    branchId: string
    managerId: string
    budget: number
    status: 'active' | 'inactive'
  }>
): Promise<{ department: Department; message: string }> => {
  try {
    const { data } = await api.put(`/departments/${id}`, departmentData)
    return data
  } catch (error) {
    console.error('[departmentService] updateDepartment error:', error)
    throw error
  }
}

export const deleteDepartment = async (id: string): Promise<{ message: string }> => {
  try {
    const { data } = await api.delete(`/departments/${id}`)
    return data
  } catch (error) {
    console.error('[departmentService] deleteDepartment error:', error)
    throw error
  }
}

export interface DepartmentEmployees {
  department: {
    _id: string
    name: string
    code: string
  }
  employees: Array<{
    _id: string
    name: string
    email: string
    role: string
    isActive: boolean
  }>
  counts: {
    totalEmployees: number
    activeEmployees: number
  }
}

export const getDepartmentEmployees = async (id: string): Promise<DepartmentEmployees> => {
  try {
    const { data } = await api.get(`/departments/${id}/employees`)
    return data
  } catch (error) {
    console.error('[departmentService] getDepartmentEmployees error:', error)
    throw error
  }
}

export interface DepartmentListResponse {
  departments: Array<{ _id: string; name: string; code: string; branchId: { _id: string; name: string; code: string } }>
}

export const getDepartmentsList = async (branchId?: string): Promise<DepartmentListResponse> => {
  try {
    const { data } = await api.get('/departments/list', { params: branchId ? { branchId } : {} })
    return data
  } catch (error) {
    console.error('[departmentService] getDepartmentsList error:', error)
    throw error
  }
}

export interface TransferEmployeesResponse {
  message: string
  transferred: {
    employees: number
  }
  source: {
    departmentId: string
    departmentName: string
    departmentCode: string
  }
  target: {
    departmentId: string
    departmentName: string
    departmentCode: string
  }
}

export const transferEmployees = async (
  sourceDepartmentId: string,
  targetDepartmentId: string
): Promise<TransferEmployeesResponse> => {
  try {
    const { data } = await api.post(`/departments/${sourceDepartmentId}/transfer`, {
      targetDepartmentId,
    })
    return data
  } catch (error) {
    console.error('[departmentService] transferEmployees error:', error)
    throw error
  }
}

export interface MergeDepartmentsResponse extends TransferEmployeesResponse {
  message: string
}

export const mergeDepartments = async (
  sourceDepartmentId: string,
  targetDepartmentId: string
): Promise<MergeDepartmentsResponse> => {
  try {
    const { data } = await api.post(`/departments/${sourceDepartmentId}/merge`, {
      targetDepartmentId,
    })
    return data
  } catch (error) {
    console.error('[departmentService] mergeDepartments error:', error)
    throw error
  }
}

export const reactivateDepartment = async (id: string): Promise<{ message: string; department: Department }> => {
  try {
    const { data } = await api.post(`/departments/${id}/reactivate`)
    return data
  } catch (error) {
    console.error('[departmentService] reactivateDepartment error:', error)
    throw error
  }
}

export interface TransferSelectedEmployeesResponse {
  message: string
  transferred: {
    employees: number
    employeeIds: string[]
  }
  source: {
    departmentId: string
    departmentName: string
    departmentCode: string
  }
  target: {
    departmentId: string
    departmentName: string
    departmentCode: string
  }
}

export const transferSelectedEmployees = async (
  sourceDepartmentId: string,
  targetDepartmentId: string,
  employeeIds: string[]
): Promise<TransferSelectedEmployeesResponse> => {
  try {
    const { data } = await api.post(`/departments/${sourceDepartmentId}/transfer-selected`, {
      targetDepartmentId,
      employeeIds,
    })
    return data
  } catch (error) {
    console.error('[departmentService] transferSelectedEmployees error:', error)
    throw error
  }
}

