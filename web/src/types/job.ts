export interface JobMatchPayload {
  resumeContent: string
  resumeId?: string
  jobTitle: string
  jobDescription: string
  jobDescriptionId?: string
  companyName?: string
}

export interface JobDescriptionRecord {
  id: string
  jobTitle: string
  companyName?: string
  content: string
  source?: 'manual' | 'auto'
  createdAt: string
}

export interface JobDescriptionPayload {
  jobTitle: string
  companyName?: string
  content: string
}

export type UpdateJobDescriptionPayload = Partial<JobDescriptionPayload>

export interface JobMatchResult {
  matchScore: number
  summary: string
  dimensionScores: {
    skillMatch: number
    projectRelevance: number
    engineeringAbility: number
    businessUnderstanding: number
  }
  matchedKeywords: string[]
  missingKeywords: string[]
  advantages: string[]
  risks: string[]
  resumeSuggestions: string[]
  interviewPreparation: string[]
}

export interface JobMatchResponse {
  matchScore: number
  result: JobMatchResult
  cached?: boolean
  meta?: {
    cached?: boolean
    status: 'success' | 'parse_error'
  }
}
