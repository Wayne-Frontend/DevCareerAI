import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export type HistoryType = 'resume-analysis' | 'project-optimization' | 'job-match' | 'interview'

export interface HistoryRecord {
  id: string
  type: HistoryType
  title: string
  score?: number
  createdAt: Date
  detail?: unknown
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(type?: HistoryType) {
    if (type) {
      return this.findByType(type)
    }

    const all = await Promise.all([
      this.findByType('resume-analysis'),
      this.findByType('project-optimization'),
      this.findByType('job-match'),
      this.findByType('interview'),
    ])

    return all.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async remove(id: string) {
    const [resume, project, job, interview] = await Promise.all([
      this.prisma.resumeAnalysis.deleteMany({ where: { id } }),
      this.prisma.projectOptimization.deleteMany({ where: { id } }),
      this.prisma.jobMatchAnalysis.deleteMany({ where: { id } }),
      this.prisma.interviewSession.deleteMany({ where: { id } }),
    ])

    return {
      id,
      success: resume.count + project.count + job.count + interview.count > 0,
    }
  }

  private async findByType(type: HistoryType): Promise<HistoryRecord[]> {
    if (type === 'resume-analysis') {
      const rows = await this.prisma.resumeAnalysis.findMany({
        include: { resume: true },
        orderBy: { createdAt: 'desc' },
      })
      return rows.map((row) => ({
        id: row.id,
        type,
        title: row.resume.title,
        score: row.score,
        createdAt: row.createdAt,
        detail: row.resultJson,
      }))
    }

    if (type === 'project-optimization') {
      const rows = await this.prisma.projectOptimization.findMany({
        orderBy: { createdAt: 'desc' },
      })
      return rows.map((row) => ({
        id: row.id,
        type,
        title: row.targetRole ? `${row.targetRole} 项目优化` : '项目经历优化',
        createdAt: row.createdAt,
        detail: row.resultJson,
      }))
    }

    if (type === 'job-match') {
      const rows = await this.prisma.jobMatchAnalysis.findMany({
        include: { jobDescription: true },
        orderBy: { createdAt: 'desc' },
      })
      return rows.map((row) => ({
        id: row.id,
        type,
        title: row.jobDescription.jobTitle,
        score: row.matchScore,
        createdAt: row.createdAt,
        detail: row.resultJson,
      }))
    }

    const rows = await this.prisma.interviewSession.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => ({
      id: row.id,
      type,
      title: row.title,
      score: readTotalScore(row.summaryJson),
      createdAt: row.createdAt,
      detail: row.summaryJson,
    }))
  }
}

function readTotalScore(value: unknown) {
  if (!value || typeof value !== 'object' || !('totalScore' in value)) return undefined
  const score = Number(value.totalScore)
  return Number.isFinite(score) ? score : undefined
}
