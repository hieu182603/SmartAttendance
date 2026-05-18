import api from '@/services/api'

interface Location {
  _id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius: number
  isActive: boolean
  description?: string
}

interface BranchListItem {
  _id: string
  name: string
  code: string
  latitude: number
  longitude: number
}

interface BranchesListResponse {
  branches: BranchListItem[]
}

/**
 * Lấy danh sách tất cả locations (từ branches) đang active
 */
export const getAllLocations = async (): Promise<Location[]> => {
  try {
    const { data } = await api.get<BranchesListResponse>('/branches/list')
    
    // Map branches sang format locations
    return data.branches.map(branch => ({
      _id: branch._id,
      name: branch.name,
      address: branch.name, // Dùng name làm address
      latitude: branch.latitude,
      longitude: branch.longitude,
      radius: 100, // Default radius 100m
      isActive: true, // Chỉ lấy active branches
      description: branch.name
    }))
  } catch (error) {
    console.warn('[location] getAllLocations failed', error)
    return []
  }
}




