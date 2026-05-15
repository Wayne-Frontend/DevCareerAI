export interface JobMatchPayload {
  resumeContent: string
  resumeId?: string
  jobTitle: string
  jobDescription: string
  companyName?: string
}

export interface JobMatchResult {
  matchScore: number
  summary: string
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
}
