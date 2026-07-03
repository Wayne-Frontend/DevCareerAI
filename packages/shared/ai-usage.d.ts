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

export interface AiUsageUserItem {
  // 发起调用的用户 id；null 表示未登录时产生的匿名调用
  userId: string | null
  // 展示用用户名；匿名调用统一归入“匿名”
  username: string
  calls: number
  totalTokens: number
}

export interface AiUsageSummary {
  range: { since: string; days: number }
  totals: AiUsageTotals
  byFeature: AiUsageBreakdownItem[]
  byModel: AiUsageBreakdownItem[]
  // 按用户 token 消耗降序的 Top N（含匿名桶）
  byUser: AiUsageUserItem[]
  daily: AiUsageDailyItem[]
}
