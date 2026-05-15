import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { HistoryRecord } from '../types/history'

export const useHistoryStore = defineStore('history', () => {
  const records = ref<HistoryRecord[]>([])

  function setRecords(nextRecords: HistoryRecord[]) {
    records.value = nextRecords
  }

  return {
    records,
    setRecords,
  }
})
