export type HistoryType =
  | 'resume-analysis'
  | 'project-optimization'
  | 'job-match'
  | 'interview'

export interface ProjectOptimizationHistoryDetail {
  rawContent?: string
  targetRole?: string | null
  techStack?: string[] | null
  style?: string | null
  projectName?: string
  projectDescription?: string
  responsibilities?: string[]
  highlights?: string[]
  difficulties?: string[]
  interviewQuestions?: string[]
}

export interface JobMatchHistoryDetail {
  resumeContent?: string
  resumeId?: string
  jobTitle?: string
  companyName?: string | null
  jobDescription?: string
  jobDescriptionId?: string
  matchScore?: number
  summary?: string
  matchedKeywords?: string[]
  missingKeywords?: string[]
  advantages?: string[]
  risks?: string[]
  resumeSuggestions?: string[]
  interviewPreparation?: string[]
}

export type KnownHistoryDetail = ProjectOptimizationHistoryDetail | JobMatchHistoryDetail | Record<string, unknown>

export interface HistoryRecord {
  id: string
  type: HistoryType
  title: string
  score?: number
  createdAt: string
  detail?: KnownHistoryDetail | unknown
}
