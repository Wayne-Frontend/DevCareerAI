import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { getAiResultStatus } from '../../common/utils/ai-result-status.util'
import { safeParseJson } from '../../common/utils/json-response.util'
import { toStringList } from '../../common/utils/normalize.util'
import { AI_TEXT_LIMITS, limitTextForAi } from '../../common/utils/text-limit.util'
import { stableStringify } from '../../common/utils/stable-json.util'
import { AiCacheService, type AiGeneration } from '../ai/ai-cache.service'
import { AiService } from '../ai/ai.service'
import type { AiStreamCallbacks, ProjectOptimizationResult } from '../ai/ai.types'
import { PrismaService } from '../../prisma/prisma.service'
import { CAREER_ASSISTANT_SYSTEM_PROMPT } from '../../prompts/resume.prompt'
import { buildProjectOptimizePrompt } from '../../prompts/project.prompt'
import { OptimizeProjectDto } from './dto/optimize-project.dto'

interface OptimizePayload {
  systemPrompt: string
  userPrompt: string
  temperature: number
  maxTokens: number
}

const OPTIMIZE_FEATURE = 'project-optimization'
const OPTIMIZE_VERSION = 'project-optimization-v2'

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly aiCacheService: AiCacheService,
  ) {}

  async optimize(dto: OptimizeProjectDto, userId: string) {
    return this.produceOptimization(dto, userId, (payload) =>
      this.generateWithChat(payload, dto, userId),
    )
  }

  async optimizeStream(dto: OptimizeProjectDto, userId: string, callbacks: AiStreamCallbacks = {}) {
    return this.produceOptimization(dto, userId, (payload) =>
      this.generateWithStream(payload, dto, callbacks, userId),
    )
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

  private async produceOptimization(
    dto: OptimizeProjectDto,
    userId: string,
    generate: (payload: OptimizePayload) => Promise<AiGeneration<ProjectOptimizationResult>>,
  ) {
    const model = this.aiService.getModel('quality')
    const payload: OptimizePayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildPrompt(dto),
      temperature: 0.25,
      maxTokens: 2400,
    }

    const { result, cached, status } = await this.aiCacheService.resolve<ProjectOptimizationResult>(
      { feature: OPTIMIZE_FEATURE, model, version: OPTIMIZE_VERSION, payload },
      () => generate(payload),
    )

    // 缓存命中说明输入未变、结果与此前完全一致：复用该用户已有记录，避免重复历史。
    if (!cached || !(await this.hasReusableOptimization(userId, result))) {
      await this.createOptimization(dto, result, userId)
    }

    return {
      result,
      cached,
      meta: { cached, status },
    }
  }

  private async generateWithChat(
    payload: OptimizePayload,
    dto: OptimizeProjectDto,
    userId: string,
  ): Promise<AiGeneration<ProjectOptimizationResult>> {
    const text = await this.aiService.chat({
      ...payload,
      modelTier: 'quality',
      feature: OPTIMIZE_FEATURE,
      userId,
    })
    return this.toGeneration(text, dto)
  }

  private async generateWithStream(
    payload: OptimizePayload,
    dto: OptimizeProjectDto,
    callbacks: AiStreamCallbacks,
    userId: string,
  ): Promise<AiGeneration<ProjectOptimizationResult>> {
    const stream = await this.aiService.chatStream({
      ...payload,
      modelTier: 'quality',
      feature: OPTIMIZE_FEATURE,
      userId,
      signal: callbacks.signal,
      onDelta: callbacks.onDelta,
      onUsage: callbacks.onUsage,
    })
    return this.toGeneration(stream.text, dto)
  }

  private toGeneration(
    text: string,
    dto: OptimizeProjectDto,
  ): AiGeneration<ProjectOptimizationResult> {
    const parsed = safeParseJson<ProjectOptimizationResult>(text)
    return {
      result: normalizeProjectResult(parsed, dto),
      rawText: text,
      status: getAiResultStatus(parsed),
    }
  }

  private buildPrompt(dto: OptimizeProjectDto) {
    return buildProjectOptimizePrompt({
      ...dto,
      rawContent: limitTextForAi(dto.rawContent, AI_TEXT_LIMITS.project),
    })
  }

  private createOptimization(
    dto: OptimizeProjectDto,
    result: ProjectOptimizationResult,
    userId: string,
  ) {
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

  // 在该用户近期的项目优化记录中查找 resultJson 完全一致的一条（缓存命中即同输入同结果），命中则无需再写。
  private async hasReusableOptimization(userId: string, result: ProjectOptimizationResult) {
    const target = stableStringify(result)
    const recent = await this.prisma.projectOptimization.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { resultJson: true },
    })

    return recent.some((row) => stableStringify(row.resultJson) === target)
  }
}

export function normalizeProjectResult(
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
