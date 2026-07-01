import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, Resume } from '@prisma/client'
import { getAiResultStatus } from '../../common/utils/ai-result-status.util'
import { safeParseJson } from '../../common/utils/json-response.util'
import { clampScore, toStringList } from '../../common/utils/normalize.util'
import { AI_TEXT_LIMITS, limitTextForAi } from '../../common/utils/text-limit.util'
import { AiCacheService, type AiGeneration } from '../ai/ai-cache.service'
import { AiService } from '../ai/ai.service'
import type { AiStreamCallbacks, JobMatchResult } from '../ai/ai.types'
import { PrismaService } from '../../prisma/prisma.service'
import { buildJobMatchPrompt } from '../../prompts/job.prompt'
import { CAREER_ASSISTANT_SYSTEM_PROMPT } from '../../prompts/resume.prompt'
import { MatchJobDto } from './dto/match-job.dto'

interface MatchPayload {
  systemPrompt: string
  userPrompt: string
  temperature: number
  maxTokens: number
}

const MATCH_FEATURE = 'job-match'
const MATCH_VERSION = 'job-match-v2'

@Injectable()
export class JobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly aiCacheService: AiCacheService,
  ) {}

  async match(dto: MatchJobDto, userId: string) {
    return this.produceMatch(dto, userId, (payload) => this.generateWithChat(payload))
  }

  async matchStream(dto: MatchJobDto, userId: string, callbacks: AiStreamCallbacks = {}) {
    return this.produceMatch(dto, userId, (payload) => this.generateWithStream(payload, callbacks))
  }

  findDescriptions(userId: string) {
    return this.prisma.jobDescription.findMany({
      where: { userId, source: 'manual' },
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

  private async produceMatch(
    dto: MatchJobDto,
    userId: string,
    generate: (payload: MatchPayload) => Promise<AiGeneration<JobMatchResult>>,
  ) {
    const resumeRecord = await this.resolveResume(dto, userId)
    const jobDescription = await this.resolveJobDescription(dto, userId)
    const model = this.aiService.getModel('quality')
    const payload: MatchPayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildPrompt(dto),
      temperature: 0.2,
      maxTokens: 2400,
    }

    const { result, cached, status } = await this.aiCacheService.resolve<JobMatchResult>(
      { feature: MATCH_FEATURE, model, version: MATCH_VERSION, payload },
      () => generate(payload),
    )

    await this.createMatchAnalysis(resumeRecord.id, jobDescription.id, result)

    return {
      matchScore: result.matchScore,
      result,
      cached,
      meta: { cached, status },
    }
  }

  private async generateWithChat(payload: MatchPayload): Promise<AiGeneration<JobMatchResult>> {
    const text = await this.aiService.chat({ ...payload, modelTier: 'quality' })
    return this.toGeneration(text)
  }

  private async generateWithStream(
    payload: MatchPayload,
    callbacks: AiStreamCallbacks,
  ): Promise<AiGeneration<JobMatchResult>> {
    const stream = await this.aiService.chatStream({
      ...payload,
      modelTier: 'quality',
      signal: callbacks.signal,
      onDelta: callbacks.onDelta,
      onUsage: callbacks.onUsage,
    })
    return this.toGeneration(stream.text)
  }

  private toGeneration(text: string): AiGeneration<JobMatchResult> {
    const parsed = safeParseJson<JobMatchResult>(text)
    return {
      result: normalizeJobMatchResult(parsed),
      rawText: text,
      status: getAiResultStatus(parsed),
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
        source: 'auto',
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
        source: 'auto',
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

export function normalizeJobMatchResult(value: JobMatchResult | { rawText: string; parseError: true }): JobMatchResult {
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
