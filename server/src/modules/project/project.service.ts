import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { getAiResultStatus } from '../../common/utils/ai-result-status.util'
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

  async optimize(dto: OptimizeProjectDto, userId: string) {
    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildPrompt(dto),
      temperature: 0.25,
      maxTokens: 2400,
      modelTier: 'quality',
    })
    const parsed = safeParseJson<ProjectOptimizationResult>(aiText)
    const status = getAiResultStatus(parsed)
    const result = normalizeProjectResult(parsed, dto)

    await this.createOptimization(dto, result, userId)

    return {
      result,
      meta: { status },
    }
  }

  async optimizeStream(dto: OptimizeProjectDto, userId: string, callbacks: AiStreamCallbacks = {}) {
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
      version: 'project-optimization-v2',
      payload: cachePayload,
    })

    const generated = cached
      ? { result: cached.result, status: 'success' as const }
      : await this.generateOptimization({
          cachePayload,
          model,
          dto,
          callbacks,
        })
    const result = generated.result

    await this.createOptimization(dto, result, userId)

    return {
      result,
      cached: Boolean(cached),
      meta: {
        cached: Boolean(cached),
        status: generated.status,
      },
    }
  }

  findOptimizations(userId: string) {
    return this.prisma.projectOptimization.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rawContent: true,
        targetRole: true,
        techStack: true,
        style: true,
        resultJson: true,
        createdAt: true,
      },
    })
  }

  async findOptimization(id: string, userId: string) {
    const optimization = await this.prisma.projectOptimization.findFirst({ where: { id, userId } })

    if (!optimization) {
      throw new NotFoundException('Project optimization not found')
    }

    return optimization
  }

  async removeOptimization(id: string, userId: string) {
    const result = await this.prisma.projectOptimization.deleteMany({ where: { id, userId } })

    return {
      id,
      success: result.count > 0,
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
    const parsed = safeParseJson<ProjectOptimizationResult>(stream.text)
    const status = getAiResultStatus(parsed)
    const result = normalizeProjectResult(parsed, params.dto)

    await this.aiCacheService.set({
      feature: 'project-optimization',
      model: params.model,
      version: 'project-optimization-v2',
      payload: params.cachePayload,
      result,
      rawText: stream.text,
    })

    return { result, status }
  }

  private createOptimization(dto: OptimizeProjectDto, result: ProjectOptimizationResult, userId: string) {
    return this.prisma.projectOptimization.create({
      data: {
        userId,
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
