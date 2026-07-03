export type HistoryType = 'resume-analysis' | 'project-optimization' | 'job-match' | 'interview'

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

// 面试复盘详情：除总结外附带完整问答回放（transcript）与会话状态，
// ongoing 的会话可从复盘中心跳回模拟面试页继续。
export interface InterviewHistoryDetail {
  status?: 'ongoing' | 'finished'
  targetRole?: string | null
  interviewType?: string
  difficulty?: string
  totalScore?: number
  summary?: string
  strengths?: string[]
  weaknesses?: string[]
  studyPlan?: string[]
  transcript?: Array<{
    id: string
    role: 'ai' | 'user'
    content: string
    feedback?: {
      score: number
      comment: string
      problems: string[]
      betterAnswer: string
    }
    createdAt: string
  }>
}

export type KnownHistoryDetail =
  | ProjectOptimizationHistoryDetail
  | JobMatchHistoryDetail
  | InterviewHistoryDetail
  | Record<string, unknown>

// 列表项：GET /history 只返回轻量汇总（不带 detail），避免把简历/JD 原文、
// 面试 transcript 等大字段整表拉给前端。详情按需走 GET /history/:id。
export interface HistoryRecordSummary {
  id: string
  type: HistoryType
  title: string
  score?: number
  // 仅 interview 类型返回：列表卡片据此标记"进行中"的会话。
  status?: 'ongoing' | 'finished'
  createdAt: string
}

export interface HistoryRecord extends HistoryRecordSummary {
  detail?: KnownHistoryDetail | unknown
}
