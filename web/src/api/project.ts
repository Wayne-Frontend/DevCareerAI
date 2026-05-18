import { request } from './request'
import { streamRequest, type StreamHandlers } from './streamRequest'
import type { AiResponseMeta, ProjectOptimizationRecord, ProjectOptimizationResult, ProjectOptimizePayload } from '../types/project'

export function optimizeProject(data: ProjectOptimizePayload) {
  return request<{ result: ProjectOptimizationResult; meta?: AiResponseMeta }>({
    url: '/projects/optimize',
    method: 'POST',
    data,
  })
}

export interface ProjectOptimizationStreamResponse {
  result: ProjectOptimizationResult
  cached?: boolean
  meta?: AiResponseMeta
}

export function optimizeProjectStream(
  data: ProjectOptimizePayload,
  handlers?: StreamHandlers<ProjectOptimizationStreamResponse>,
) {
  return streamRequest<ProjectOptimizationStreamResponse>('/projects/optimize/stream', data, handlers)
}

export function getProjectOptimizations() {
  return request<ProjectOptimizationRecord[]>({
    url: '/projects/optimizations',
    method: 'GET',
  })
}

export function getProjectOptimization(id: string) {
  return request<ProjectOptimizationRecord>({
    url: `/projects/optimizations/${id}`,
    method: 'GET',
  })
}

export function deleteProjectOptimization(id: string) {
  return request<{ id: string; success: boolean }>({
    url: `/projects/optimizations/${id}`,
    method: 'DELETE',
  })
}
