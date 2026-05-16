import { request } from './request'
import { streamRequest, type StreamHandlers } from './streamRequest'
import type {
  ResumeAnalysisResponse,
  ResumePayload,
  ResumeRecord,
  ResumeUploadResponse,
} from '../types/resume'

export function createResume(data: ResumePayload) {
  return request<ResumeRecord>({
    url: '/resumes',
    method: 'POST',
    data,
  })
}

export function uploadResume(file: File) {
  const data = new FormData()
  data.append('file', file)

  return request<ResumeUploadResponse>({
    url: '/resumes/upload',
    method: 'POST',
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function analyzeResume(id: string) {
  return request<ResumeAnalysisResponse>({
    url: `/resumes/${id}/analyze`,
    method: 'POST',
  })
}

export function analyzeResumeStream(id: string, handlers?: StreamHandlers<ResumeAnalysisResponse & { cached?: boolean }>) {
  return streamRequest<ResumeAnalysisResponse & { cached?: boolean }>(`/resumes/${id}/analyze/stream`, undefined, handlers)
}
