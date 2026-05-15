import { request } from './request'
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

export function submitInterviewAnswer(sessionId: string, answer: string) {
  return request<InterviewMessageResponse>({
    url: `/interviews/${sessionId}/messages`,
    method: 'POST',
    data: { answer },
  })
}

export function finishInterview(sessionId: string) {
  return request<InterviewFinishResponse>({
    url: `/interviews/${sessionId}/finish`,
    method: 'POST',
  })
}
