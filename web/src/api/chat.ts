import { request } from './request'
import { streamRequest, type StreamHandlers } from './streamRequest'
import type {
  ChatSendResponse,
  ChatSessionDetail,
  ChatSessionSummary,
  CreateChatSessionPayload,
  UpdateChatSessionPayload,
} from '@/types/chat'

export function createChatSession(data: CreateChatSessionPayload = {}) {
  return request<ChatSessionSummary>({
    url: '/chat/sessions',
    method: 'POST',
    data,
  })
}

export function getChatSessions() {
  return request<ChatSessionSummary[]>({
    url: '/chat/sessions',
    method: 'GET',
  })
}

export function getChatSession(sessionId: string) {
  return request<ChatSessionDetail>({
    url: `/chat/sessions/${sessionId}`,
    method: 'GET',
  })
}

export function updateChatSession(sessionId: string, data: UpdateChatSessionPayload) {
  return request<ChatSessionSummary>({
    url: `/chat/sessions/${sessionId}`,
    method: 'PATCH',
    data,
  })
}

export function deleteChatSession(sessionId: string) {
  return request<{ deleted: boolean }>({
    url: `/chat/sessions/${sessionId}`,
    method: 'DELETE',
  })
}

export function sendChatMessage(sessionId: string, content: string) {
  return request<ChatSendResponse>({
    url: `/chat/sessions/${sessionId}/messages`,
    method: 'POST',
    data: { content },
  })
}

export function sendChatMessageStream(
  sessionId: string,
  content: string,
  handlers?: StreamHandlers,
) {
  return streamRequest<ChatSendResponse>(
    `/chat/sessions/${sessionId}/messages/stream`,
    { content },
    handlers,
  )
}
