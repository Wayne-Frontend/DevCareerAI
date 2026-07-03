import { request } from './request'
import type { DashboardOverview, DashboardResumeTrend } from '@/types/dashboard'

export function getDashboardOverview() {
  return request<DashboardOverview>({
    url: '/dashboard/overview',
    method: 'GET',
  })
}

export function getResumeScoreTrend() {
  return request<DashboardResumeTrend>({
    url: '/dashboard/resume-trend',
    method: 'GET',
  })
}
