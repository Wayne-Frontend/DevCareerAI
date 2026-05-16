import { request } from './request'
import { streamRequest, type StreamHandlers } from './streamRequest'
import type {
  InterviewCreatePayload,
  InterviewCreateResponse,
  InterviewFinishResponse,
  InterviewMessageResponse,
} from '../types/interview'

export function createInterview(data: InterviewCreatePayload) {
  return request<InterviewCreateResponse>({
    url: '/interviews',
    method: 'POST',
    data,
  })
}

export function createInterviewStream(
  data: InterviewCreatePayload,
  handlers?: StreamHandlers<InterviewCreateResponse & { cached?: boolean }>,
) {
  return streamRequest<InterviewCreateResponse & { cached?: boolean }>('/interviews/stream', data, handlers)
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
  handlers?: StreamHandlers<InterviewMessageResponse & { cached?: boolean }>,
) {
  return streamRequest<InterviewMessageResponse & { cached?: boolean }>(
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

export function finishInterviewStream(
  sessionId: string,
  handlers?: StreamHandlers<InterviewFinishResponse & { sessionId: string; cached?: boolean }>,
) {
  return streamRequest<InterviewFinishResponse & { sessionId: string; cached?: boolean }>(
    `/interviews/${sessionId}/finish/stream`,
    undefined,
    handlers,
  )
}
