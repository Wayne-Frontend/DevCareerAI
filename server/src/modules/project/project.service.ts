import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { safeParseJson } from '../../common/utils/json-response.util'
import { AI_TEXT_LIMITS, limitTextForAi } from '../../common/utils/text-limit.util'
import { AiCacheService } from '../ai/ai-cache.service'
import { AiService } from '../ai/ai.service'
import type { AiUsage, ProjectOptimizationResult } from '../ai/ai.types'
import { PrismaService } from '../../prisma/prisma.service'
import { CAREER_ASSISTANT_SYSTEM_PROMPT } from '../../prompts/resume.prompt'
import { buildProjectOptimizePrompt } from '../../prompts/project.prompt'
import { OptimizeProjectDto } from './dto/optimize-project.dto'

interface AiStreamCallbacks {
  signal?: AbortSignal
  onDelta?: (delta: string) => void
  onUsage?: (usage: AiUsage) => void
}

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly aiCacheService: AiCacheService,
  ) {}

  async optimize(dto: OptimizeProjectDto) {
    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildPrompt(dto),
      temperature: 0.25,
      maxTokens: 2400,
      modelTier: 'quality',
    })
    const result = normalizeProjectResult(safeParseJson<ProjectOptimizationResult>(aiText), dto)

    await this.createOptimization(dto, result)

    return result
  }

  async optimizeStream(dto: OptimizeProjectDto, callbacks: AiStreamCallbacks = {}) {
    const model = this.aiService.getModel('quality')
    const cachePayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildPrompt(dto),
      temperature: 0.25,
      maxTokens: 2400,
    }
    const cached = await this.aiCacheService.get<ProjectOptimizationResult>({
      feature: 'project-optimization',
      model,
      payload: cachePayload,
    })

    const result =
      cached?.result ||
      (await this.generateOptimization({
        cachePayload,
        model,
        dto,
        callbacks,
      }))

    await this.createOptimization(dto, result)

    return {
      result,
      cached: Boolean(cached),
    }
  }

  private buildPrompt(dto: OptimizeProjectDto) {
    return buildProjectOptimizePrompt({
      ...dto,
      rawContent: limitTextForAi(dto.rawContent, AI_TEXT_LIMITS.project),
    })
  }

  private async generateOptimization(params: {
    cachePayload: {
      systemPrompt: string
      userPrompt: string
      temperature: number
      maxTokens: number
    }
    model: string
    dto: OptimizeProjectDto
    callbacks: AiStreamCallbacks
  }) {
    const stream = await this.aiService.chatStream({
      ...params.cachePayload,
      modelTier: 'quality',
      signal: params.callbacks.signal,
      onDelta: params.callbacks.onDelta,
      onUsage: params.callbacks.onUsage,
    })
    const result = normalizeProjectResult(safeParseJson<ProjectOptimizationResult>(stream.text), params.dto)

    await this.aiCacheService.set({
      feature: 'project-optimization',
      model: params.model,
      payload: params.cachePayload,
      result,
      rawText: stream.text,
    })

    return result
  }

  private createOptimization(dto: OptimizeProjectDto, result: ProjectOptimizationResult) {
    return this.prisma.projectOptimization.create({
      data: {
        rawContent: dto.rawContent,
        targetRole: dto.targetRole,
        techStack: dto.techStack as unknown as Prisma.InputJsonValue,
        style: dto.style,
        resultJson: result as unknown as Prisma.InputJsonValue,
      },
    })
  }
}

function normalizeProjectResult(
  value: ProjectOptimizationResult | { rawText: string; parseError: true },
  dto: OptimizeProjectDto,
): ProjectOptimizationResult {
  if ('parseError' in value) {
    return {
      projectName: 'AI 原文结果',
      projectDescription: value.rawText,
      techStack: dto.techStack || [],
      responsibilities: [],
      highlights: [],
      difficulties: ['AI 返回内容不是合法 JSON，已保留原文。'],
      interviewQuestions: [],
    }
  }

  return {
    projectName: String(value.projectName || '项目经历优化建议'),
    projectDescription: String(value.projectDescription || ''),
    techStack: dto.techStack?.length ? dto.techStack : toStringList(value.techStack),
    responsibilities: toStringList(value.responsibilities),
    highlights: toStringList(value.highlights),
    difficulties: toStringList(value.difficulties),
    interviewQuestions: toStringList(value.interviewQuestions),
  }
}

function toStringList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}
