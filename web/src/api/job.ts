import { request } from './request'
import type { JobMatchPayload, JobMatchResponse } from '../types/job'

export function matchJob(data: JobMatchPayload) {
  return request<JobMatchResponse>({
    url: '/jobs/match',
    method: 'POST',
    data,
  })
}
