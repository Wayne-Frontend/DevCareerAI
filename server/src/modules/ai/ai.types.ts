export interface ChatOptions {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'json_object' | 'text'
  thinking?: 'enabled' | 'disabled'
  modelTier?: 'fast' | 'quality'
}

export interface AiUsage {
  completion_tokens?: number
  prompt_tokens?: number
  prompt_cache_hit_tokens?: number
  prompt_cache_miss_tokens?: number
  total_tokens?: number
}

export interface ChatStreamOptions extends ChatOptions {
  signal?: AbortSignal
  onDelta?: (delta: string) => void
  onUsage?: (usage: AiUsage) => void
}

export interface ChatStreamResult {
  text: string
  usage?: AiUsage
  model: string
}

export type AiResultStatus = 'success' | 'parse_error'

export interface AiResponseMeta {
  cached?: boolean
  status: AiResultStatus
}

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

export interface ProjectOptimizationResult {
  projectName: string
  projectDescription: string
  techStack: string[]
  responsibilities: string[]
  highlights: string[]
  difficulties: string[]
  interviewQuestions: string[]
}

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

export interface InterviewQuestionResult {
  question: string
  questionType: string
  expectedPoints: string[]
}

export interface InterviewFeedbackResult {
  score: number
  comment: string
  problems: string[]
  betterAnswer: string
  followUpQuestion: string
}

export interface InterviewSummaryResult {
  totalScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  studyPlan: string[]
}
