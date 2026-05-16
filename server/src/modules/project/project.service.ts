import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { safeParseJson } from '../../common/utils/json-response.util'
import { AiService } from '../ai/ai.service'
import type { ProjectOptimizationResult } from '../ai/ai.types'
import { PrismaService } from '../../prisma/prisma.service'
import { CAREER_ASSISTANT_SYSTEM_PROMPT } from '../../prompts/resume.prompt'
import { buildProjectOptimizePrompt } from '../../prompts/project.prompt'
import { OptimizeProjectDto } from './dto/optimize-project.dto'

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async optimize(dto: OptimizeProjectDto) {
    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: buildProjectOptimizePrompt(dto),
      temperature: 0.25,
      maxTokens: 2400,
    })
    const parsed = safeParseJson<ProjectOptimizationResult>(aiText)
    const result = normalizeProjectResult(parsed, dto)

    await this.prisma.projectOptimization.create({
      data: {
        rawContent: dto.rawContent,
        targetRole: dto.targetRole,
        techStack: dto.techStack as unknown as Prisma.InputJsonValue,
        style: dto.style,
        resultJson: result as unknown as Prisma.InputJsonValue,
      },
    })

    return result
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
