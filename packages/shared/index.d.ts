// 前后端共享的 API 契约类型入口。
// 约定：本包只放请求/响应的“线上形状”（JSON 序列化后的形态，日期一律 string），
// 各端内部模型（如 server 侧的 Date、Prisma 实体）在各自边界处对齐，不放进来。
export type { AiResponseMeta } from './common'
export type {
  AuthUser,
  AuthSession,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from './auth'
export type {
  ResumePayload,
  UpdateResumePayload,
  ResumeRecord,
  ResumeAnalysisResult,
  ResumeAnalysisResponse,
  ResumeUploadResponse,
} from './resume'
export type {
  ProjectOptimizePayload,
  ProjectOptimizationResult,
  ProjectOptimizationRecord,
} from './project'
export type {
  JobDescriptionPayload,
  UpdateJobDescriptionPayload,
  JobDescriptionRecord,
  JobMatchPayload,
  JobMatchResult,
  JobMatchResponse,
} from './job'
export type {
  InterviewCreatePayload,
  SubmitAnswerPayload,
  InterviewCreateResponse,
  InterviewFeedbackResult,
  InterviewMessageResponse,
  InterviewFinishResponse,
} from './interview'
export type {
  ChatContextResume,
  ChatContextJob,
  ChatSessionSummary,
  ChatMessageRecord,
  ChatSessionDetail,
  CreateChatSessionPayload,
  UpdateChatSessionPayload,
  SendChatMessagePayload,
  ChatSendResponse,
} from './chat'
export type {
  DashboardMetric,
  DashboardResumeDimensions,
  DashboardScoreTrendPoint,
  DashboardResumeTrend,
  DashboardOverview,
} from './dashboard'
export type {
  HistoryType,
  ProjectOptimizationHistoryDetail,
  JobMatchHistoryDetail,
  KnownHistoryDetail,
  HistoryRecord,
} from './history'
export type {
  AiUsageTotals,
  AiUsageBreakdownItem,
  AiUsageDailyItem,
  AiUsageUserItem,
  AiUsageSummary,
} from './ai-usage'
