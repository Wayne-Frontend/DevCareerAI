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
