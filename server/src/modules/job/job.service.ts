import { Injectable } from '@nestjs/common'
import { Prisma, Resume } from '@prisma/client'
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

  async match(dto: MatchJobDto) {
    const resumeRecord = await this.resolveResume(dto)
    const jobDescription = await this.createJobDescription(dto)
    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildPrompt(dto),
      temperature: 0.2,
      maxTokens: 2400,
      modelTier: 'quality',
    })
    const result = normalizeJobMatchResult(safeParseJson<JobMatchResult>(aiText))

    await this.createMatchAnalysis(resumeRecord.id, jobDescription.id, result)

    return {
      matchScore: result.matchScore,
      result,
    }
  }

  async matchStream(dto: MatchJobDto, callbacks: AiStreamCallbacks = {}) {
    const resumeRecord = await this.resolveResume(dto)
    const jobDescription = await this.createJobDescription(dto)
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
      payload: cachePayload,
    })
    const result =
      cached?.result ||
      (await this.generateMatch({
        cachePayload,
        model,
        callbacks,
      }))

    await this.createMatchAnalysis(resumeRecord.id, jobDescription.id, result)

    return {
      matchScore: result.matchScore,
      result,
      cached: Boolean(cached),
    }
  }

  private async resolveResume(dto: MatchJobDto): Promise<Resume> {
    const resume = dto.resumeId
      ? await this.prisma.resume.findUnique({ where: { id: dto.resumeId } })
      : await this.prisma.resume.create({
          data: {
            title: `${dto.jobTitle} 匹配分析简历`,
            content: dto.resumeContent,
            targetRole: dto.jobTitle,
          },
        })

    return (
      resume ||
      (await this.prisma.resume.create({
        data: {
          title: `${dto.jobTitle} 匹配分析简历`,
          content: dto.resumeContent,
          targetRole: dto.jobTitle,
        },
      }))
    )
  }

  private createJobDescription(dto: MatchJobDto) {
    return this.prisma.jobDescription.create({
      data: {
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
    const result = normalizeJobMatchResult(safeParseJson<JobMatchResult>(stream.text))

    await this.aiCacheService.set({
      feature: 'job-match',
      model: params.model,
      payload: params.cachePayload,
      result,
      rawText: stream.text,
    })

    return result
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
