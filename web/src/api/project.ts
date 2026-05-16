import { request } from './request'
import { streamRequest, type StreamHandlers } from './streamRequest'
import type { ProjectOptimizationResult, ProjectOptimizePayload } from '../types/project'

export function optimizeProject(data: ProjectOptimizePayload) {
  return request<ProjectOptimizationResult>({
    url: '/projects/optimize',
    method: 'POST',
    data,
  })
}

export interface ProjectOptimizationStreamResponse {
  result: ProjectOptimizationResult
  cached?: boolean
}

export function optimizeProjectStream(
  data: ProjectOptimizePayload,
  handlers?: StreamHandlers<ProjectOptimizationStreamResponse>,
) {
  return streamRequest<ProjectOptimizationStreamResponse>('/projects/optimize/stream', data, handlers)
}
