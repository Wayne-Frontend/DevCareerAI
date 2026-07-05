import { request } from './request'
import { streamRequest, type StreamHandlers } from './streamRequest'
import type {
  JobDescriptionPayload,
  JobDescriptionRecord,
  JobMatchPayload,
  JobMatchResponse,
  UpdateJobDescriptionPayload,
} from '@/types/job'

export function matchJob(data: JobMatchPayload) {
  return request<JobMatchResponse>({
    url: '/jobs/match',
    method: 'POST',
    data,
  })
}

export function matchJobStream(data: JobMatchPayload, handlers?: StreamHandlers) {
  return streamRequest<JobMatchResponse & { cached?: boolean }>(
    '/jobs/match/stream',
    data,
    handlers,
  )
}

export function getJobDescriptions() {
  return request<JobDescriptionRecord[]>({
    url: '/jobs/descriptions',
    method: 'GET',
  })
}

export function createJobDescription(data: JobDescriptionPayload) {
  return request<JobDescriptionRecord>({
    url: '/jobs/descriptions',
    method: 'POST',
    data,
  })
}

export function updateJobDescription(id: string, data: UpdateJobDescriptionPayload) {
  return request<JobDescriptionRecord>({
    url: `/jobs/descriptions/${id}`,
    method: 'PATCH',
    data,
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
