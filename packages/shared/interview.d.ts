import type { AiResponseMeta } from './common'

export interface InterviewCreatePayload {
  resumeContent: string
  resumeId?: string
  jobDescription?: string
  jobDescriptionId?: string
  targetRole: string
  interviewType: string
  difficulty: string
}

export interface SubmitAnswerPayload {
  answer: string
}

export interface InterviewCreateResponse {
  sessionId: string
  firstQuestion: string
  expectedPoints: string[]
  cached?: boolean
  meta?: AiResponseMeta
}

export interface InterviewFeedbackResult {
  score: number
  comment: string
  problems: string[]
  betterAnswer: string
  followUpQuestion: string
}

export interface InterviewMessageResponse {
  feedback: {
    score: number
    comment: string
    problems: string[]
    betterAnswer: string
  }
  nextQuestion: string
  cached?: boolean
  meta?: AiResponseMeta
}

export interface InterviewFinishResponse {
  totalScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  studyPlan: string[]
  sessionId?: string
  cached?: boolean
  meta?: AiResponseMeta
}

export type InterviewSessionStatus = 'ongoing' | 'summarizing' | 'finished'

export interface InterviewSessionSummary {
  id: string
  title: string
  targetRole?: string | null
  interviewType: string
  difficulty: string
  status: InterviewSessionStatus
  messageCount: number
  createdAt: string
  updatedAt: string
}

// 面试历史消息：AI 消息可能带逐题点评（回答后的反馈）或考察要点（首题）。
export interface InterviewSessionMessage {
  id: string
  role: 'ai' | 'user'
  content: string
  feedback?: {
    score: number
    comment: string
    problems: string[]
    betterAnswer: string
  }
  expectedPoints?: string[]
  createdAt: string
}

export interface InterviewSessionSummaryResult {
  totalScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  studyPlan: string[]
}

export interface InterviewSessionDetail extends InterviewSessionSummary {
  messages: InterviewSessionMessage[]
  summary?: InterviewSessionSummaryResult | null
}
