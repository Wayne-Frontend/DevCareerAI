export type HistoryType =
  | 'resume-analysis'
  | 'project-optimization'
  | 'job-match'
  | 'interview'

export interface HistoryRecord {
  id: string
  type: HistoryType
  title: string
  score?: number
  createdAt: string
  detail?: unknown
}
