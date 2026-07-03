export interface ProjectOptimizePayload {
  rawContent: string
  targetRole?: string
  techStack?: string[]
  style?: string
}

export interface ProjectOptimizationResult {
  projectName: string
  projectDescription: string
  techStack: string[]
  responsibilities: string[]
  highlights: string[]
  difficulties: string[]
  interviewQuestions: string[]
}

export interface ProjectOptimizationRecord {
  id: string
  rawContent: string
  targetRole?: string
  techStack?: string[]
  style?: string
  resultJson: ProjectOptimizationResult
  createdAt: string
}
