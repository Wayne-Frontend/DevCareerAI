import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { safeParseJson } from '../../common/utils/json-response.util'
import { AiService } from '../ai/ai.service'
import type { JobMatchResult } from '../ai/ai.types'
import { PrismaService } from '../../prisma/prisma.service'
import { buildJobMatchPrompt } from '../../prompts/job.prompt'
import { CAREER_ASSISTANT_SYSTEM_PROMPT } from '../../prompts/resume.prompt'
import { MatchJobDto } from './dto/match-job.dto'

@Injectable()
export class JobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async match(dto: MatchJobDto) {
    const resume = dto.resumeId
      ? await this.prisma.resume.findUnique({ where: { id: dto.resumeId } })
      : await this.prisma.resume.create({
          data: {
            title: `${dto.jobTitle} 匹配分析简历`,
            content: dto.resumeContent,
            targetRole: dto.jobTitle,
          },
        })

    const resumeRecord =
      resume ||
      (await this.prisma.resume.create({
        data: {
          title: `${dto.jobTitle} 匹配分析简历`,
          content: dto.resumeContent,
          targetRole: dto.jobTitle,
        },
      }))

    const jobDescription = await this.prisma.jobDescription.create({
      data: {
        jobTitle: dto.jobTitle,
        companyName: dto.companyName,
        content: dto.jobDescription,
      },
    })

    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: buildJobMatchPrompt(dto),
      temperature: 0.2,
      maxTokens: 2400,
    })
    const parsed = safeParseJson<JobMatchResult>(aiText)
    const result = normalizeJobMatchResult(parsed)

    await this.prisma.jobMatchAnalysis.create({
      data: {
        resumeId: resumeRecord.id,
        jobDescriptionId: jobDescription.id,
        matchScore: result.matchScore,
        resultJson: result as unknown as Prisma.InputJsonValue,
      },
    })

    return {
      matchScore: result.matchScore,
      result,
    }
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
