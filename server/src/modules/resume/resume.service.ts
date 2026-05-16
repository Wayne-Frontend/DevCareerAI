import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { safeParseJson } from '../../common/utils/json-response.util'
import { AiService } from '../ai/ai.service'
import type { ResumeAnalysisResult } from '../ai/ai.types'
import { PrismaService } from '../../prisma/prisma.service'
import { buildResumeAnalyzePrompt, CAREER_ASSISTANT_SYSTEM_PROMPT } from '../../prompts/resume.prompt'
import { CreateResumeDto } from './dto/create-resume.dto'

@Injectable()
export class ResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  create(dto: CreateResumeDto) {
    return this.prisma.resume.create({
      data: dto,
    })
  }

  async analyze(id: string) {
    const resume = await this.prisma.resume.findUnique({ where: { id } })

    if (!resume) {
      throw new NotFoundException('Resume not found')
    }

    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: buildResumeAnalyzePrompt({
        resumeContent: resume.content,
        targetRole: resume.targetRole || undefined,
        experienceLevel: resume.experienceLevel || undefined,
      }),
      temperature: 0.2,
      maxTokens: 2600,
    })
    const parsed = safeParseJson<ResumeAnalysisResult>(aiText)
    const result = normalizeResumeAnalysisResult(parsed)

    const analysis = await this.prisma.resumeAnalysis.create({
      data: {
        resumeId: resume.id,
        score: result.score,
        resultJson: result as unknown as Prisma.InputJsonValue,
      },
    })

    return {
      analysisId: analysis.id,
      score: result.score,
      result,
    }
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
