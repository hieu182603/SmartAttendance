import api from '@/services/api'
import type { AxiosRequestConfig } from 'axios'

// ── Types ────────────────────────────────────────────────────────────
export interface AnalyticsOverview {
  pageviews: number
  pageviewsTrend: number
  users: number
  usersTrend: number
  sessions: number
  sessionDuration: string
  sessionDurationTrend: number
  bounceRate: string
  bounceRateTrend: number
}

export interface TrafficTrendItem {
  label: string
  views: number
  users: number
}

export interface TopPage {
  path: string
  views: number
  bounceRate: number
}

export interface ChannelItem {
  name: string
  value: number
  sessions: number
  color: string
}

export interface DeviceItem {
  name: string
  value: number
  sessions: number
  color: string
}

export interface LocationItem {
  city: string
  count: number
  percent: number
}

export interface AnalyticsReport {
  configured: boolean
  overview: AnalyticsOverview | null
  trafficTrend: TrafficTrendItem[]
  topPages: TopPage[]
  channels: ChannelItem[]
  devices: DeviceItem[]
  locations: LocationItem[]
  activeUsers: number
}

export interface RealtimeData {
  configured: boolean
  activeUsers: number
}

// ── API calls ────────────────────────────────────────────────────────
export type DateRange = 'today' | '7days' | '30days' | '90days'

export const getAnalyticsReport = async (
  range: DateRange = '7days',
  config: AxiosRequestConfig = {}
): Promise<AnalyticsReport> => {
  try {
    const { data } = await api.get(`/analytics/report?range=${range}`, config)
    return data as AnalyticsReport
  } catch (error) {
    const err = error as Error & { response?: { status?: number; data?: { configured?: boolean } } }
    // If 503, GA not configured
    if (err.response?.status === 503) {
      return {
        configured: false,
        overview: null,
        trafficTrend: [],
        topPages: [],
        channels: [],
        devices: [],
        locations: [],
        activeUsers: 0,
      }
    }
    throw error
  }
}

export const getRealtimeUsers = async (
  config: AxiosRequestConfig = {}
): Promise<RealtimeData> => {
  try {
    const { data } = await api.get('/analytics/realtime', config)
    return data as RealtimeData
  } catch {
    return { configured: false, activeUsers: 0 }
  }
}
