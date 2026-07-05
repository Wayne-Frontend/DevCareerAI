import { request } from './request'
import { streamRequest, type StreamHandlers } from './streamRequest'
import type {
  InterviewCreatePayload,
  InterviewCreateResponse,
  InterviewFinishResponse,
  InterviewMessageResponse,
  InterviewSessionDetail,
  InterviewSessionSummary,
} from '@/types/interview'

export function getInterviewSessions() {
  return request<InterviewSessionSummary[]>({
    url: '/interviews',
    method: 'GET',
  })
}

export function getInterviewSession(sessionId: string) {
  return request<InterviewSessionDetail>({
    url: `/interviews/${sessionId}`,
    method: 'GET',
  })
}

export function createInterview(data: InterviewCreatePayload) {
  return request<InterviewCreateResponse>({
    url: '/interviews',
    method: 'POST',
    data,
  })
}

export function createInterviewStream(data: InterviewCreatePayload, handlers?: StreamHandlers) {
  return streamRequest<InterviewCreateResponse>('/interviews/stream', data, handlers)
}

export function submitInterviewAnswer(sessionId: string, answer: string) {
  return request<InterviewMessageResponse>({
    url: `/interviews/${sessionId}/messages`,
    method: 'POST',
    data: { answer },
  })
}

export function submitInterviewAnswerStream(
  sessionId: string,
  answer: string,
  handlers?: StreamHandlers,
) {
  return streamRequest<InterviewMessageResponse>(
    `/interviews/${sessionId}/messages/stream`,
    { answer },
    handlers,
  )
}

export function finishInterview(sessionId: string) {
  return request<InterviewFinishResponse>({
    url: `/interviews/${sessionId}/finish`,
    method: 'POST',
  })
}

export function finishInterviewStream(sessionId: string, handlers?: StreamHandlers) {
  return streamRequest<InterviewFinishResponse>(
    `/interviews/${sessionId}/finish/stream`,
    undefined,
    handlers,
  )
}
