import { request } from './request'
import { streamRequest, type StreamHandlers } from './streamRequest'
import type { JobDescriptionRecord, JobMatchPayload, JobMatchResponse } from '../types/job'

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

export function getJobDescriptions() {
  return request<JobDescriptionRecord[]>({
    url: '/jobs/descriptions',
    method: 'GET',
  })
}

export function getJobDescription(id: string) {
  return request<JobDescriptionRecord>({
    url: `/jobs/descriptions/${id}`,
    method: 'GET',
  })
}

export function deleteJobDescription(id: string) {
  return request<{ id: string; success: boolean }>({
    url: `/jobs/descriptions/${id}`,
    method: 'DELETE',
  })
}
