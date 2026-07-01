export interface DashboardMetric {
  // 当前值；null 表示该功能尚无数据
  score: number | null
  // 相对上一条记录的变化；null 表示不足两条、无法对比
  delta: number | null
}

export interface DashboardResumeDimensions {
  completeness: number
  skillMatch: number
  projectQuality: number
  technicalDepth: number
  professionalExpression: number
}

export interface DashboardOverview {
  // 用户是否已产生任何可展示的数据，前端据此决定是否显示空状态引导
  hasData: boolean
  resume: DashboardMetric & {
    dimensionScores: DashboardResumeDimensions | null
    lastAnalyzedAt: string | null
  }
  jobMatch: DashboardMetric
  interview: DashboardMetric
  // 简历诊断 + 岗位匹配 + 已完成面试的累计条数
  recordCount: number
  // 取自最近一次简历诊断的改进建议（不足时以不足项补充），最多 4 条
  suggestions: string[]
}
