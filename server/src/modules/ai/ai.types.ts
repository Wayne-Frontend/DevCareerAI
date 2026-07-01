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
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  // 各服务可能返回额外的用量字段（如 DeepSeek 的 prompt_cache_hit_tokens），按原样透传，不在通用类型里写死。
  [key: string]: number | undefined
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
