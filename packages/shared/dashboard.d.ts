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

export interface DashboardScoreTrendPoint {
  // 诊断时间（ISO 字符串），前端自行截取展示粒度
  date: string
  // 该次诊断的综合得分 0-100
  score: number
}

export interface DashboardResumeTrend {
  // 趋势对应的简历（取最近一次诊断的那份）；null 表示用户还没有任何诊断记录
  resumeId: string | null
  title: string | null
  // 该简历历次诊断得分，按时间正序；长度为 1 时前端提示“再诊断一次即可看到趋势”
  points: DashboardScoreTrendPoint[]
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
