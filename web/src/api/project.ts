import { request } from './request'
import type { ProjectOptimizationResult, ProjectOptimizePayload } from '../types/project'

export function optimizeProject(data: ProjectOptimizePayload) {
  return request<ProjectOptimizationResult>({
    url: '/projects/optimize',
    method: 'POST',
    data,
  })
}
