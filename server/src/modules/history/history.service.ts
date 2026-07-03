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

  async findAll(userId: string, type?: HistoryType) {
    if (type) {
      return this.findByType(type, userId)
    }

    const all = await Promise.all([
      this.findByType('resume-analysis', userId),
      this.findByType('project-optimization', userId),
      this.findByType('job-match', userId),
      this.findByType('interview', userId),
    ])

    return all.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async remove(id: string, userId: string) {
    const [resume, project, job, interview] = await Promise.all([
      this.prisma.resumeAnalysis.deleteMany({ where: { id, resume: { userId } } }),
      this.prisma.projectOptimization.deleteMany({ where: { id, userId } }),
      this.prisma.jobMatchAnalysis.deleteMany({
        where: { id, resume: { userId }, jobDescription: { userId } },
      }),
      this.prisma.interviewSession.deleteMany({ where: { id, userId } }),
    ])

    return {
      id,
      success: resume.count + project.count + job.count + interview.count > 0,
    }
  }

  private async findByType(type: HistoryType, userId: string): Promise<HistoryRecord[]> {
    if (type === 'resume-analysis') {
      const rows = await this.prisma.resumeAnalysis.findMany({
        where: { resume: { userId } },
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
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
      return rows.map((row) => ({
        id: row.id,
        type,
        title: row.targetRole ? `${row.targetRole} 项目优化` : '项目经历优化',
        createdAt: row.createdAt,
        detail: {
          ...toDetailObject(row.resultJson),
          rawContent: row.rawContent,
          targetRole: row.targetRole,
          techStack: row.techStack,
          style: row.style,
        },
      }))
    }

    if (type === 'job-match') {
      const rows = await this.prisma.jobMatchAnalysis.findMany({
        where: {
          resume: { userId },
          jobDescription: { userId },
        },
        include: { resume: true, jobDescription: true },
        orderBy: { createdAt: 'desc' },
      })
      return rows.map((row) => ({
        id: row.id,
        type,
        title: row.jobDescription.jobTitle,
        score: row.matchScore,
        createdAt: row.createdAt,
        detail: {
          ...toDetailObject(row.resultJson),
          resumeContent: row.resume.content,
          resumeId: row.resumeId,
          jobTitle: row.jobDescription.jobTitle,
          companyName: row.jobDescription.companyName,
          jobDescription: row.jobDescription.content,
          jobDescriptionId: row.jobDescriptionId,
        },
      }))
    }

    const rows = await this.prisma.interviewSession.findMany({
      where: { userId },
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

function toDetailObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
