// 与后端 server/src/modules/ai/ai-usage.types.ts 保持一致。
export interface AiUsageTotals {
  calls: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface AiUsageBreakdownItem {
  key: string
  calls: number
  totalTokens: number
}

export interface AiUsageDailyItem {
  date: string
  calls: number
  totalTokens: number
}

export interface AiUsageSummary {
  range: { since: string; days: number }
  totals: AiUsageTotals
  byFeature: AiUsageBreakdownItem[]
  byModel: AiUsageBreakdownItem[]
  daily: AiUsageDailyItem[]
}
