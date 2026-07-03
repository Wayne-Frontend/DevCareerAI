import { request } from './request'
import type { HistoryRecord, HistoryRecordSummary, HistoryType } from '@/types/history'

// 列表只含轻量汇总（无 detail），完整内容按需取详情。
export function getHistory(type?: HistoryType) {
  return request<HistoryRecordSummary[]>({
    url: '/history',
    method: 'GET',
    params: type ? { type } : undefined,
  })
}

export function getHistoryRecord(id: string) {
  return request<HistoryRecord>({
    url: `/history/${id}`,
    method: 'GET',
  })
}

export function deleteHistoryRecord(id: string) {
  return request<{ success: boolean }>({
    url: `/history/${id}`,
    method: 'DELETE',
  })
}
