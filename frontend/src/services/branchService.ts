import api from '@/services/api'

export interface Branch {
  _id: string
  id?: string
  name: string
  code: string
  latitude: number
  longitude: number
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
  latitude: number
  longitude: number
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
    latitude: number
    longitude: number
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

export interface BranchResources {
  branch: {
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
  departments: Array<{
    _id: string
    name: string
    code: string
    status: string
  }>
  counts: {
    totalEmployees: number
    activeEmployees: number
    totalDepartments: number
    activeDepartments: number
  }
}

export const getBranchResources = async (id: string): Promise<BranchResources> => {
  try {
    const { data } = await api.get(`/branches/${id}/resources`)
    return data
  } catch (error) {
    console.error('[branchService] getBranchResources error:', error)
    throw error
  }
}

export interface TransferResourcesResponse {
  message: string
  transferred: {
    employees: number
    departments: number
  }
  source: {
    branchId: string
    branchName: string
    branchCode: string
  }
  target: {
    branchId: string
    branchName: string
    branchCode: string
  }
}

export const transferResources = async (
  sourceBranchId: string,
  targetBranchId: string
): Promise<TransferResourcesResponse> => {
  try {
    const { data } = await api.post(`/branches/${sourceBranchId}/transfer`, {
      targetBranchId,
    })
    return data
  } catch (error) {
    console.error('[branchService] transferResources error:', error)
    throw error
  }
}

export interface MergeBranchesResponse extends TransferResourcesResponse {
  message: string
}

export const mergeBranches = async (
  sourceBranchId: string,
  targetBranchId: string
): Promise<MergeBranchesResponse> => {
  try {
    const { data } = await api.post(`/branches/${sourceBranchId}/merge`, {
      targetBranchId,
    })
    return data
  } catch (error) {
    console.error('[branchService] mergeBranches error:', error)
    throw error
  }
}

export const reactivateBranch = async (id: string): Promise<{ message: string; branch: Branch }> => {
  try {
    const { data } = await api.post(`/branches/${id}/reactivate`)
    return data
  } catch (error) {
    console.error('[branchService] reactivateBranch error:', error)
    throw error
  }
}

