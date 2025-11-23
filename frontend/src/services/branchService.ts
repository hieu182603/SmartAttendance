import api from './api'

export interface Branch {
  _id: string
  id?: string
  name: string
  code: string
  address: string
  city: string
  country: string
  phone?: string
  email?: string
  managerId?: string | {
    _id: string
    name: string
    email: string
  } | null
  managerName?: string
  establishedDate?: string
  status: 'active' | 'inactive'
  timezone: string
  employeeCount?: number
  departmentCount?: number
}

export interface BranchStats {
  total: number
  totalEmployees: number
  totalDepartments: number
  active: number
}

export interface BranchesResponse {
  branches: Branch[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BranchListResponse {
  branches: Array<{ _id: string; name: string; code: string }>
}

export const getAllBranches = async (params: {
  page?: number
  limit?: number
  search?: string
  status?: string
} = {}): Promise<BranchesResponse> => {
  try {
    const { data } = await api.get('/branches', { params })
    return data
  } catch (error) {
    console.error('[branchService] getAllBranches error:', error)
    throw error
  }
}

export const getBranchStats = async (): Promise<BranchStats> => {
  try {
    const { data } = await api.get('/branches/stats')
    return data
  } catch (error) {
    console.error('[branchService] getBranchStats error:', error)
    throw error
  }
}

export const getBranchById = async (id: string): Promise<{ branch: Branch }> => {
  try {
    const { data } = await api.get(`/branches/${id}`)
    return data
  } catch (error) {
    console.error('[branchService] getBranchById error:', error)
    throw error
  }
}

export const getBranchesList = async (): Promise<BranchListResponse> => {
  try {
    const { data } = await api.get('/branches/list')
    return data
  } catch (error) {
    console.error('[branchService] getBranchesList error:', error)
    throw error
  }
}

export const createBranch = async (branchData: {
  name: string
  code: string
  address: string
  city: string
  country?: string
  phone?: string
  email?: string
  managerId: string
  timezone?: string
  establishedDate?: string
}): Promise<{ branch: Branch; message: string }> => {
  try {
    const { data } = await api.post('/branches', branchData)
    return data
  } catch (error) {
    console.error('[branchService] createBranch error:', error)
    throw error
  }
}

export const updateBranch = async (
  id: string,
  branchData: Partial<{
    name: string
    code: string
    address: string
    city: string
    country: string
    phone: string
    email: string
    managerId: string
    timezone: string
    establishedDate: string
    status: 'active' | 'inactive'
  }>
): Promise<{ branch: Branch; message: string }> => {
  try {
    const { data } = await api.put(`/branches/${id}`, branchData)
    return data
  } catch (error) {
    console.error('[branchService] updateBranch error:', error)
    throw error
  }
}

export const deleteBranch = async (id: string): Promise<{ message: string }> => {
  try {
    const { data } = await api.delete(`/branches/${id}`)
    return data
  } catch (error) {
    console.error('[branchService] deleteBranch error:', error)
    throw error
  }
}

