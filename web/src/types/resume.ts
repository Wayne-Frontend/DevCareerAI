export interface ResumePayload {
  title: string
  content: string
  targetRole?: string
  experienceLevel?: string
}

export interface ResumeRecord extends ResumePayload {
  id: string
  fileName?: string
  fileType?: string
  createdAt?: string
  updatedAt?: string
}

export type UpdateResumePayload = Partial<ResumePayload>

export interface ResumeAnalysisResult {
  score: number
  summary: string
  dimensionScores: {
    completeness: number
    skillMatch: number
    projectQuality: number
    technicalDepth: number
    professionalExpression: number
  }
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  projectSuggestions: string[]
  optimizedExamples: Array<{
    before: string
    after: string
    reason: string
  }>
}

export interface ResumeAnalysisResponse {
  analysisId: string
  score: number
  result: ResumeAnalysisResult
  cached?: boolean
  meta?: {
    cached?: boolean
    status: 'success' | 'parse_error'
  }
}

export interface ResumeUploadResponse {
  fileName: string
  fileType: string
  content: string
  truncated?: boolean
}
