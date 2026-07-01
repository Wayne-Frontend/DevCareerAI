export interface DashboardMetric {
  score: number | null
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
  hasData: boolean
  resume: DashboardMetric & {
    dimensionScores: DashboardResumeDimensions | null
    lastAnalyzedAt: string | null
  }
  jobMatch: DashboardMetric
  interview: DashboardMetric
  recordCount: number
  suggestions: string[]
}
