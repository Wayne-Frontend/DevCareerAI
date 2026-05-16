import { request } from './request'
import { streamRequest, type StreamHandlers } from './streamRequest'
import type { JobMatchPayload, JobMatchResponse } from '../types/job'

export function matchJob(data: JobMatchPayload) {
  return request<JobMatchResponse>({
    url: '/jobs/match',
    method: 'POST',
    data,
  })
}

export function matchJobStream(data: JobMatchPayload, handlers?: StreamHandlers<JobMatchResponse & { cached?: boolean }>) {
  return streamRequest<JobMatchResponse & { cached?: boolean }>('/jobs/match/stream', data, handlers)
}
