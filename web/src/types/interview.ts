export interface InterviewCreatePayload {
  resumeContent: string
  resumeId?: string
  jobDescription?: string
  jobDescriptionId?: string
  targetRole: string
  interviewType: string
  difficulty: string
}

export interface InterviewCreateResponse {
  sessionId: string
  firstQuestion: string
  expectedPoints: string[]
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
}

export interface InterviewFinishResponse {
  totalScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  studyPlan: string[]
}

export interface ChatMessage {
  id: string
  role: 'ai' | 'user' | 'system'
  content: string
  feedback?: {
    score: number
    comment: string
    problems?: string[]
    betterAnswer?: string
  }
}
