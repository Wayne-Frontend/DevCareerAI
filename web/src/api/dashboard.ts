import { request } from './request'
import type { DashboardOverview } from '@/types/dashboard'

export function getDashboardOverview() {
  return request<DashboardOverview>({
    url: '/dashboard/overview',
    method: 'GET',
  })
}
