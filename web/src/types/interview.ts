// 契约类型已下沉到 @devcareer/shared（前后端单一事实源），此处仅转发以保持既有 import 路径稳定。
export type {
  InterviewCreatePayload,
  SubmitAnswerPayload,
  InterviewCreateResponse,
  InterviewFeedbackResult,
  InterviewMessageResponse,
  InterviewFinishResponse,
  InterviewSessionStatus,
  InterviewSessionSummary,
  InterviewSessionMessage,
  InterviewSessionSummaryResult,
  InterviewSessionDetail,
  AiResponseMeta,
} from '@devcareer/shared'

// 纯前端视图模型（面试聊天气泡的渲染形状），不属于 API 契约，保留在 web 侧。
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
