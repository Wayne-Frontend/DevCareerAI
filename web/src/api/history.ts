import { request } from './request'
import type { HistoryRecord, HistoryType } from '../types/history'

export function getHistory(type: HistoryType) {
  return request<HistoryRecord[]>({
    url: '/history',
    method: 'GET',
    params: { type },
  })
}

export function deleteHistoryRecord(id: string) {
  return request<{ success: boolean }>({
    url: `/history/${id}`,
    method: 'DELETE',
  })
}
