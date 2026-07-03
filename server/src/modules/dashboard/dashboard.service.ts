import { Injectable } from '@nestjs/common'
import { clampScore, toStringList } from '../../common/utils/normalize.util'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  DashboardMetric,
  DashboardOverview,
  DashboardResumeDimensions,
} from './dashboard.types'

const SUGGESTION_LIMIT = 4

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string): Promise<DashboardOverview> {
    const [resumeRows, jobRows, interviewRows, resumeCount, jobCount, interviewCount] =
      await Promise.all([
        this.prisma.resumeAnalysis.findMany({
          where: { resume: { userId } },
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: { score: true, createdAt: true, resultJson: true },
        }),
        this.prisma.jobMatchAnalysis.findMany({
          where: { resume: { userId }, jobDescription: { userId } },
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: { matchScore: true },
        }),
        this.prisma.interviewSession.findMany({
          where: { userId, status: 'finished' },
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: { summaryJson: true },
        }),
        this.prisma.resumeAnalysis.count({ where: { resume: { userId } } }),
        this.prisma.jobMatchAnalysis.count({
          where: { resume: { userId }, jobDescription: { userId } },
        }),
        this.prisma.interviewSession.count({ where: { userId, status: 'finished' } }),
      ])

    const latestResume = resumeRows[0]
    const interviewScores = interviewRows
      .map((row) => readNumberField(row.summaryJson, 'totalScore'))
      .filter((value): value is number => value !== null)

    return {
      hasData: resumeCount + jobCount + interviewCount > 0,
      resume: {
        ...toMetric(resumeRows.map((row) => row.score)),
        dimensionScores: latestResume ? extractDimensionScores(latestResume.resultJson) : null,
        lastAnalyzedAt: latestResume ? latestResume.createdAt.toISOString() : null,
      },
      jobMatch: toMetric(jobRows.map((row) => row.matchScore)),
      interview: toMetric(interviewScores),
      recordCount: resumeCount + jobCount + interviewCount,
      suggestions: latestResume ? extractSuggestions(latestResume.resultJson) : [],
    }
  }
}

function toMetric(scores: number[]): DashboardMetric {
  const [latest, previous] = scores

  return {
    score: latest ?? null,
    delta: latest !== undefined && previous !== undefined ? latest - previous : null,
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNumberField(source: unknown, key: string): number | null {
  if (!isObject(source)) return null
  const value = Number(source[key])
  return Number.isFinite(value) ? value : null
}

function extractDimensionScores(resultJson: unknown): DashboardResumeDimensions | null {
  if (!isObject(resultJson) || !isObject(resultJson.dimensionScores)) return null

  const dimensions = resultJson.dimensionScores
  return {
    completeness: clampScore(dimensions.completeness),
    skillMatch: clampScore(dimensions.skillMatch),
    projectQuality: clampScore(dimensions.projectQuality),
    technicalDepth: clampScore(dimensions.technicalDepth),
    professionalExpression: clampScore(dimensions.professionalExpression),
  }
}

function extractSuggestions(resultJson: unknown): string[] {
  if (!isObject(resultJson)) return []

  const suggestions = toStringList(resultJson.suggestions)
  const source = suggestions.length ? suggestions : toStringList(resultJson.weaknesses)
  return source.slice(0, SUGGESTION_LIMIT)
}
