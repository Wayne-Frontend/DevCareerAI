export interface ChatContextResume {
  id: string
  title: string
}

export interface ChatContextJob {
  id: string
  jobTitle: string
  companyName?: string | null
}

export interface ChatSessionSummary {
  id: string
  title: string
  resumeId?: string | null
  jobDescriptionId?: string | null
  createdAt: string
  updatedAt: string
  resume?: ChatContextResume | null
  jobDescription?: ChatContextJob | null
}

export interface ChatMessageRecord {
  id: string
  role: 'user' | 'ai'
  content: string
  createdAt: string
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: ChatMessageRecord[]
}

export interface CreateChatSessionPayload {
  resumeId?: string
  jobDescriptionId?: string
}

export interface UpdateChatSessionPayload {
  title?: string
  // null 表示取消勾选该上下文
  resumeId?: string | null
  jobDescriptionId?: string | null
}

export interface SendChatMessagePayload {
  content: string
}

export interface ChatSendResponse {
  sessionId: string
  title: string
  userMessage: ChatMessageRecord
  aiMessage: ChatMessageRecord
}
