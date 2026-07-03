import { request } from './request'
import type { AiUsageSummary } from '@/types/aiUsage'

// 全局 AI token 用量汇总，仅管理员可访问（后端 @Roles('admin')）。
export function getAiUsageSummary(days = 30) {
  return request<AiUsageSummary>({
    url: '/ai-usage/summary',
    method: 'GET',
    params: { days },
  })
}
