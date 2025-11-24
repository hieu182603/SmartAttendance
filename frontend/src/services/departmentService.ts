import api from './api'

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

