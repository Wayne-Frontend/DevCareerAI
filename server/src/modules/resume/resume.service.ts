import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, Resume } from '@prisma/client'
import { getAiResultStatus } from '../../common/utils/ai-result-status.util'
import { safeParseJson } from '../../common/utils/json-response.util'
import { AI_TEXT_LIMITS, limitTextForAi } from '../../common/utils/text-limit.util'
import { AiCacheService } from '../ai/ai-cache.service'
import { AiService } from '../ai/ai.service'
import type { AiUsage, ResumeAnalysisResult } from '../ai/ai.types'
import { PrismaService } from '../../prisma/prisma.service'
import { buildResumeAnalyzePrompt, CAREER_ASSISTANT_SYSTEM_PROMPT } from '../../prompts/resume.prompt'
import { CreateResumeDto } from './dto/create-resume.dto'

interface AiStreamCallbacks {
  signal?: AbortSignal
  onDelta?: (delta: string) => void
  onUsage?: (usage: AiUsage) => void
}

@Injectable()
export class ResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly aiCacheService: AiCacheService,
  ) {}

  create(dto: CreateResumeDto, userId: string) {
    return this.prisma.resume.create({
      data: {
        ...dto,
        userId,
      },
    })
  }

  findAll(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        targetRole: true,
        experienceLevel: true,
        fileName: true,
        fileType: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async findOne(id: string, userId: string) {
    return this.findResume(id, userId)
  }

  async remove(id: string, userId: string) {
    const result = await this.prisma.resume.deleteMany({ where: { id, userId } })

    return {
      id,
      success: result.count > 0,
    }
  }

  async analyze(id: string, userId: string) {
    const resume = await this.findResume(id, userId)
    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildPrompt(resume),
      temperature: 0.2,
      maxTokens: 2600,
      modelTier: 'quality',
    })
    const parsed = safeParseJson<ResumeAnalysisResult>(aiText)
    const status = getAiResultStatus(parsed)
    const result = normalizeResumeAnalysisResult(parsed)
    const analysis = await this.createAnalysis(resume.id, result)

    return {
      analysisId: analysis.id,
      score: result.score,
      result,
      meta: { status },
    }
  }

  async analyzeStream(id: string, userId: string, callbacks: AiStreamCallbacks = {}) {
    const resume = await this.findResume(id, userId)
    const model = this.aiService.getModel('quality')
    const cachePayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildPrompt(resume),
      temperature: 0.2,
      maxTokens: 2600,
    }
    const cached = await this.aiCacheService.get<ResumeAnalysisResult>({
      feature: 'resume-analysis',
      model,
      version: 'resume-analysis-v2',
      payload: cachePayload,
    })

    const generated = cached
      ? { result: cached.result, status: 'success' as const }
      : await this.generateAnalysis({
          cachePayload,
          model,
          callbacks,
        })
    const result = generated.result
    const analysis = await this.createAnalysis(resume.id, result)

    return {
      analysisId: analysis.id,
      score: result.score,
      result,
      cached: Boolean(cached),
      meta: {
        cached: Boolean(cached),
        status: generated.status,
      },
    }
  }

  private async findResume(id: string, userId: string) {
    const resume = await this.prisma.resume.findFirst({ where: { id, userId } })

    if (!resume) {
      throw new NotFoundException('Resume not found')
    }

    return resume
  }

  private buildPrompt(resume: Resume) {
    return buildResumeAnalyzePrompt({
      resumeContent: limitTextForAi(resume.content, AI_TEXT_LIMITS.resume),
      targetRole: resume.targetRole || undefined,
      experienceLevel: resume.experienceLevel || undefined,
    })
  }

  private async generateAnalysis(params: {
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
    const parsed = safeParseJson<ResumeAnalysisResult>(stream.text)
    const status = getAiResultStatus(parsed)
    const result = normalizeResumeAnalysisResult(parsed)

    await this.aiCacheService.set({
      feature: 'resume-analysis',
      model: params.model,
      version: 'resume-analysis-v2',
      payload: params.cachePayload,
      result,
      rawText: stream.text,
    })

    return { result, status }
  }

  private createAnalysis(resumeId: string, result: ResumeAnalysisResult) {
    return this.prisma.resumeAnalysis.create({
      data: {
        resumeId,
        score: result.score,
        resultJson: result as unknown as Prisma.InputJsonValue,
      },
    })
  }
}

function normalizeResumeAnalysisResult(value: ResumeAnalysisResult | { rawText: string; parseError: true }): ResumeAnalysisResult {
  if ('parseError' in value) {
    return {
      score: 0,
      summary: value.rawText,
      dimensionScores: {
        completeness: 0,
        skillMatch: 0,
        projectQuality: 0,
        technicalDepth: 0,
        professionalExpression: 0,
      },
      strengths: [],
      weaknesses: ['AI 返回内容不是合法 JSON，已保留原文。'],
      suggestions: [],
      projectSuggestions: [],
      optimizedExamples: [],
    }
  }

  return {
    score: clampScore(value.score),
    summary: value.summary || 'AI 已完成简历诊断。',
    dimensionScores: {
      completeness: clampScore(value.dimensionScores?.completeness),
      skillMatch: clampScore(value.dimensionScores?.skillMatch),
      projectQuality: clampScore(value.dimensionScores?.projectQuality),
      technicalDepth: clampScore(value.dimensionScores?.technicalDepth),
      professionalExpression: clampScore(value.dimensionScores?.professionalExpression),
    },
    strengths: toStringList(value.strengths),
    weaknesses: toStringList(value.weaknesses),
    suggestions: toStringList(value.suggestions),
    projectSuggestions: toStringList(value.projectSuggestions),
    optimizedExamples: Array.isArray(value.optimizedExamples)
      ? value.optimizedExamples.map((item) => ({
          before: String(item.before || ''),
          after: String(item.after || ''),
          reason: String(item.reason || ''),
        }))
      : [],
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
