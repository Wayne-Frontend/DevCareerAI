import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export type HistoryType = 'resume-analysis' | 'project-optimization' | 'job-match' | 'interview'

export interface HistoryRecordSummary {
  id: string
  type: HistoryType
  title: string
  score?: number
  // 仅 interview 类型返回：列表卡片据此标记"进行中"的会话。
  status?: string
  createdAt: Date
}

export interface HistoryRecord extends HistoryRecordSummary {
  detail?: unknown
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  // 列表只返回轻量汇总：简历/JD 原文、resultJson、面试 transcript 等大字段一律不进列表，
  // 详情按需走 findOne，避免记录攒多后一次响应几 MB。
  async findAll(userId: string, type?: HistoryType): Promise<HistoryRecordSummary[]> {
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

  // id 在四类记录中唯一（均为 cuid），逐类查找直到命中；带 userId 归属过滤。
  async findOne(id: string, userId: string): Promise<HistoryRecord> {
    const record =
      (await this.findResumeAnalysisDetail(id, userId)) ||
      (await this.findProjectOptimizationDetail(id, userId)) ||
      (await this.findJobMatchDetail(id, userId)) ||
      (await this.findInterviewDetail(id, userId))

    if (!record) {
      throw new NotFoundException('History record not found')
    }

    return record
  }

  // id 在四类记录中唯一（均为 cuid）：事务内逐类尝试、命中即止，保证原子性且平均只查一半的表。
  // 归属校验统一走 resume/userId 单侧：即使出现 JD 归属异常的脏数据，简历所有者也应能删除自己的分析记录。
  async remove(id: string, userId: string) {
    const success = await this.prisma.$transaction(async (tx) => {
      const resume = await tx.resumeAnalysis.deleteMany({ where: { id, resume: { userId } } })
      if (resume.count > 0) return true

      const project = await tx.projectOptimization.deleteMany({ where: { id, userId } })
      if (project.count > 0) return true

      const job = await tx.jobMatchAnalysis.deleteMany({ where: { id, resume: { userId } } })
      if (job.count > 0) return true

      const interview = await tx.interviewSession.deleteMany({ where: { id, userId } })
      return interview.count > 0
    })

    return { id, success }
  }

  private async findByType(type: HistoryType, userId: string): Promise<HistoryRecordSummary[]> {
    if (type === 'resume-analysis') {
      const rows = await this.prisma.resumeAnalysis.findMany({
        where: { resume: { userId } },
        select: {
          id: true,
          score: true,
          createdAt: true,
          resume: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return rows.map((row) => ({
        id: row.id,
        type,
        title: row.resume.title,
        score: row.score,
        createdAt: row.createdAt,
      }))
    }

    if (type === 'project-optimization') {
      const rows = await this.prisma.projectOptimization.findMany({
        where: { userId },
        select: { id: true, targetRole: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      })
      return rows.map((row) => ({
        id: row.id,
        type,
        title: row.targetRole ? `${row.targetRole} 项目优化` : '项目经历优化',
        createdAt: row.createdAt,
      }))
    }

    if (type === 'job-match') {
      const rows = await this.prisma.jobMatchAnalysis.findMany({
        where: {
          resume: { userId },
          jobDescription: { userId },
        },
        select: {
          id: true,
          matchScore: true,
          createdAt: true,
          jobDescription: { select: { jobTitle: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return rows.map((row) => ({
        id: row.id,
        type,
        title: row.jobDescription.jobTitle,
        score: row.matchScore,
        createdAt: row.createdAt,
      }))
    }

    const rows = await this.prisma.interviewSession.findMany({
      where: { userId },
      select: { id: true, title: true, status: true, summaryJson: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => ({
      id: row.id,
      type,
      title: row.title,
      score: readTotalScore(row.summaryJson),
      status: row.status,
      createdAt: row.createdAt,
    }))
  }

  private async findResumeAnalysisDetail(
    id: string,
    userId: string,
  ): Promise<HistoryRecord | null> {
    const row = await this.prisma.resumeAnalysis.findFirst({
      where: { id, resume: { userId } },
      include: { resume: true },
    })
    if (!row) return null

    return {
      id: row.id,
      type: 'resume-analysis',
      title: row.resume.title,
      score: row.score,
      createdAt: row.createdAt,
      detail: row.resultJson,
    }
  }

  private async findProjectOptimizationDetail(
    id: string,
    userId: string,
  ): Promise<HistoryRecord | null> {
    const row = await this.prisma.projectOptimization.findFirst({ where: { id, userId } })
    if (!row) return null

    return {
      id: row.id,
      type: 'project-optimization',
      title: row.targetRole ? `${row.targetRole} 项目优化` : '项目经历优化',
      createdAt: row.createdAt,
      detail: {
        ...toDetailObject(row.resultJson),
        rawContent: row.rawContent,
        targetRole: row.targetRole,
        techStack: row.techStack,
        style: row.style,
      },
    }
  }

  private async findJobMatchDetail(id: string, userId: string): Promise<HistoryRecord | null> {
    const row = await this.prisma.jobMatchAnalysis.findFirst({
      where: { id, resume: { userId }, jobDescription: { userId } },
      include: { resume: true, jobDescription: true },
    })
    if (!row) return null

    return {
      id: row.id,
      type: 'job-match',
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
    }
  }

  private async findInterviewDetail(id: string, userId: string): Promise<HistoryRecord | null> {
    const row = await this.prisma.interviewSession.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!row) return null

    return {
      id: row.id,
      type: 'interview',
      title: row.title,
      score: readTotalScore(row.summaryJson),
      createdAt: row.createdAt,
      // 除总结外附带完整问答回放；ongoing 会话总结为空，靠 transcript 与 status 支撑复盘和"继续面试"。
      detail: {
        ...toDetailObject(row.summaryJson),
        status: row.status,
        targetRole: row.targetRole,
        interviewType: row.interviewType,
        difficulty: row.difficulty,
        transcript: row.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          feedback: readAnswerFeedback(message.feedbackJson),
          createdAt: message.createdAt,
        })),
      },
    }
  }
}

// feedbackJson 有两种形状：首题消息存考察要点，点评消息存完整反馈（含 score）。
// 复盘回放只关心逐题点评，首题的考察要点不在此展示。
function readAnswerFeedback(value: unknown) {
  const data = toDetailObject(value)
  if (!('score' in data)) return undefined

  return {
    score: Number(data.score) || 0,
    comment: String(data.comment || ''),
    problems: Array.isArray(data.problems) ? data.problems.map(String) : [],
    betterAnswer: String(data.betterAnswer || ''),
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
