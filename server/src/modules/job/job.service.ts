import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, Resume } from '@prisma/client'
import { getAiResultStatus } from '../../common/utils/ai-result-status.util'
import { safeParseJson } from '../../common/utils/json-response.util'
import { AI_TEXT_LIMITS, limitTextForAi } from '../../common/utils/text-limit.util'
import { AiCacheService } from '../ai/ai-cache.service'
import { AiService } from '../ai/ai.service'
import type { AiUsage, JobMatchResult } from '../ai/ai.types'
import { PrismaService } from '../../prisma/prisma.service'
import { buildJobMatchPrompt } from '../../prompts/job.prompt'
import { CAREER_ASSISTANT_SYSTEM_PROMPT } from '../../prompts/resume.prompt'
import { MatchJobDto } from './dto/match-job.dto'

interface AiStreamCallbacks {
  signal?: AbortSignal
  onDelta?: (delta: string) => void
  onUsage?: (usage: AiUsage) => void
}

@Injectable()
export class JobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly aiCacheService: AiCacheService,
  ) {}

  async match(dto: MatchJobDto, userId: string) {
    const resumeRecord = await this.resolveResume(dto, userId)
    const jobDescription = await this.resolveJobDescription(dto, userId)
    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildPrompt(dto),
      temperature: 0.2,
      maxTokens: 2400,
      modelTier: 'quality',
    })
    const parsed = safeParseJson<JobMatchResult>(aiText)
    const status = getAiResultStatus(parsed)
    const result = normalizeJobMatchResult(parsed)

    await this.createMatchAnalysis(resumeRecord.id, jobDescription.id, result)

    return {
      matchScore: result.matchScore,
      result,
      meta: { status },
    }
  }

  async matchStream(dto: MatchJobDto, userId: string, callbacks: AiStreamCallbacks = {}) {
    const resumeRecord = await this.resolveResume(dto, userId)
    const jobDescription = await this.resolveJobDescription(dto, userId)
    const model = this.aiService.getModel('quality')
    const cachePayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildPrompt(dto),
      temperature: 0.2,
      maxTokens: 2400,
    }
    const cached = await this.aiCacheService.get<JobMatchResult>({
      feature: 'job-match',
      model,
      version: 'job-match-v1',
      payload: cachePayload,
    })
    const generated = cached
      ? { result: cached.result, status: 'success' as const }
      : await this.generateMatch({
          cachePayload,
          model,
          callbacks,
        })
    const result = generated.result

    await this.createMatchAnalysis(resumeRecord.id, jobDescription.id, result)

    return {
      matchScore: result.matchScore,
      result,
      cached: Boolean(cached),
      meta: {
        cached: Boolean(cached),
        status: generated.status,
      },
    }
  }

  findDescriptions(userId: string) {
    return this.prisma.jobDescription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        content: true,
        createdAt: true,
      },
    })
  }

  async findDescription(id: string, userId: string) {
    const jobDescription = await this.prisma.jobDescription.findFirst({ where: { id, userId } })

    if (!jobDescription) {
      throw new NotFoundException('Job description not found')
    }

    return jobDescription
  }

  async removeDescription(id: string, userId: string) {
    const result = await this.prisma.jobDescription.deleteMany({ where: { id, userId } })

    return {
      id,
      success: result.count > 0,
    }
  }

  private async resolveResume(dto: MatchJobDto, userId: string): Promise<Resume> {
    if (dto.resumeId) {
      const resume = await this.prisma.resume.findFirst({ where: { id: dto.resumeId, userId } })

      if (!resume) {
        throw new NotFoundException('Resume not found')
      }

      return resume
    }

    return this.prisma.resume.create({
      data: {
        userId,
        title: `${dto.jobTitle} 匹配分析简历`,
        content: dto.resumeContent,
        targetRole: dto.jobTitle,
      },
    })
  }

  private async resolveJobDescription(dto: MatchJobDto, userId: string) {
    if (dto.jobDescriptionId) {
      const jobDescription = await this.prisma.jobDescription.findFirst({
        where: { id: dto.jobDescriptionId, userId },
      })

      if (!jobDescription) {
        throw new NotFoundException('Job description not found')
      }

      return jobDescription
    }

    return this.prisma.jobDescription.create({
      data: {
        userId,
        jobTitle: dto.jobTitle,
        companyName: dto.companyName,
        content: dto.jobDescription,
      },
    })
  }

  private buildPrompt(dto: MatchJobDto) {
    return buildJobMatchPrompt({
      resumeContent: limitTextForAi(dto.resumeContent, AI_TEXT_LIMITS.resume),
      jobTitle: dto.jobTitle,
      jobDescription: limitTextForAi(dto.jobDescription, AI_TEXT_LIMITS.jobDescription),
    })
  }

  private async generateMatch(params: {
    cachePayload: {
      systemPrompt: string
      userPrompt: string
      temperature: number
      maxTokens: number
    }
    model: string
    callbacks: AiStreamCallbacks
  }) {
    const stream = await this.aiService.chatStream({
      ...params.cachePayload,
      modelTier: 'quality',
      signal: params.callbacks.signal,
      onDelta: params.callbacks.onDelta,
      onUsage: params.callbacks.onUsage,
    })
    const parsed = safeParseJson<JobMatchResult>(stream.text)
    const status = getAiResultStatus(parsed)
    const result = normalizeJobMatchResult(parsed)

    await this.aiCacheService.set({
      feature: 'job-match',
      model: params.model,
      version: 'job-match-v1',
      payload: params.cachePayload,
      result,
      rawText: stream.text,
    })

    return { result, status }
  }

  private createMatchAnalysis(resumeId: string, jobDescriptionId: string, result: JobMatchResult) {
    return this.prisma.jobMatchAnalysis.create({
      data: {
        resumeId,
        jobDescriptionId,
        matchScore: result.matchScore,
        resultJson: result as unknown as Prisma.InputJsonValue,
      },
    })
  }
}

function normalizeJobMatchResult(value: JobMatchResult | { rawText: string; parseError: true }): JobMatchResult {
  if ('parseError' in value) {
    return {
      matchScore: 0,
      summary: value.rawText,
      dimensionScores: {
        skillMatch: 0,
        projectRelevance: 0,
        engineeringAbility: 0,
        businessUnderstanding: 0,
      },
      matchedKeywords: [],
      missingKeywords: [],
      advantages: [],
      risks: ['AI 返回内容不是合法 JSON，已保留原文。'],
      resumeSuggestions: [],
      interviewPreparation: [],
    }
  }

  return {
    matchScore: clampScore(value.matchScore),
    summary: String(value.summary || 'AI 已完成岗位匹配分析。'),
    dimensionScores: {
      skillMatch: clampScore(value.dimensionScores?.skillMatch),
      projectRelevance: clampScore(value.dimensionScores?.projectRelevance),
      engineeringAbility: clampScore(value.dimensionScores?.engineeringAbility),
      businessUnderstanding: clampScore(value.dimensionScores?.businessUnderstanding),
    },
    matchedKeywords: toStringList(value.matchedKeywords),
    missingKeywords: toStringList(value.missingKeywords),
    advantages: toStringList(value.advantages),
    risks: toStringList(value.risks),
    resumeSuggestions: toStringList(value.resumeSuggestions),
    interviewPreparation: toStringList(value.interviewPreparation),
  }
}

function clampScore(value: unknown) {
  const score = Number(value)
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

function toStringList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}
