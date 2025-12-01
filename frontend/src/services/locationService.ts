import api from './api'

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

interface LocationsResponse {
  success: boolean
  data: Location[]
}

/**
 * Lấy danh sách tất cả locations đang active
 */
export const getAllLocations = async (): Promise<Location[]> => {
  try {
    const { data } = await api.get<LocationsResponse>('/locations')
    return data.success ? data.data : []
  } catch (error) {
    console.warn('[location] getAllLocations failed', error)
    return []
  }
}




