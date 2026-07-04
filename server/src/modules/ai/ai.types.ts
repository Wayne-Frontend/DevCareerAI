// 多轮对话中的一条消息，与 OpenAI 兼容协议的 message 结构一致（system 由 systemPrompt 单独承载）。
export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  systemPrompt: string
  // 单轮调用的用户提示词。与 messages 二选一；两者同时提供时 messages 优先。
  userPrompt?: string
  // 多轮对话消息数组（不含 system）。用于通用聊天等需要真实多轮上下文的场景。
  messages?: ChatTurn[]
  temperature?: number
  maxTokens?: number
  responseFormat?: 'json_object' | 'text'
  thinking?: 'enabled' | 'disabled'
  modelTier?: 'fast' | 'quality'
  // 用量埋点上下文：标记本次调用属于哪个功能、归属哪个用户。不参与缓存键计算。
  feature?: string
  userId?: string | null
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

// 各业务 service 触发流式生成时透传的回调，与 SSE 的 delta/usage 事件对应。
export interface AiStreamCallbacks {
  signal?: AbortSignal
  onDelta?: (delta: string) => void
  onUsage?: (usage: AiUsage) => void
}

export interface ChatResult {
  text: string
  usage?: AiUsage
  model: string
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
  retried?: boolean
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
