import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { safeParseJson } from '../../common/utils/json-response.util'
import { AiService } from '../ai/ai.service'
import type {
  InterviewFeedbackResult,
  InterviewQuestionResult,
  InterviewSummaryResult,
} from '../ai/ai.types'
import { PrismaService } from '../../prisma/prisma.service'
import {
  buildInterviewFeedbackPrompt,
  buildInterviewQuestionPrompt,
  buildInterviewSummaryPrompt,
} from '../../prompts/interview.prompt'
import { CAREER_ASSISTANT_SYSTEM_PROMPT } from '../../prompts/resume.prompt'
import { CreateInterviewDto } from './dto/create-interview.dto'
import { SubmitAnswerDto } from './dto/submit-answer.dto'

@Injectable()
export class InterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async create(dto: CreateInterviewDto) {
    const resume = dto.resumeId
      ? await this.prisma.resume.findUnique({ where: { id: dto.resumeId } })
      : await this.prisma.resume.create({
          data: {
            title: `${dto.targetRole} 模拟面试简历`,
            content: dto.resumeContent,
            targetRole: dto.targetRole,
          },
        })
    const resumeRecord =
      resume ||
      (await this.prisma.resume.create({
        data: {
          title: `${dto.targetRole} 模拟面试简历`,
          content: dto.resumeContent,
          targetRole: dto.targetRole,
        },
      }))

    const jobDescription =
      dto.jobDescriptionId
        ? await this.prisma.jobDescription.findUnique({ where: { id: dto.jobDescriptionId } })
        : dto.jobDescription
          ? await this.prisma.jobDescription.create({
              data: {
                jobTitle: dto.targetRole,
                content: dto.jobDescription,
              },
            })
          : null

    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: buildInterviewQuestionPrompt(dto),
      temperature: 0.35,
      maxTokens: 1200,
    })
    const parsed = safeParseJson<InterviewQuestionResult>(aiText)
    const question = normalizeQuestionResult(parsed, dto)

    const session = await this.prisma.interviewSession.create({
      data: {
        resumeId: resumeRecord.id,
        jobDescriptionId: jobDescription?.id,
        title: `${dto.targetRole} ${dto.interviewType}`,
        targetRole: dto.targetRole,
        interviewType: dto.interviewType,
        difficulty: dto.difficulty,
        messages: {
          create: {
            role: 'ai',
            content: question.question,
            feedbackJson: {
              questionType: question.questionType,
              expectedPoints: question.expectedPoints,
            } as Prisma.InputJsonValue,
          },
        },
      },
    })

    return {
      sessionId: session.id,
      firstQuestion: question.question,
      expectedPoints: question.expectedPoints,
    }
  }

  async submitAnswer(sessionId: string, dto: SubmitAnswerDto) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        resume: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!session) {
      throw new NotFoundException('Interview session not found')
    }

    const lastQuestion = [...session.messages].reverse().find((message) => message.role === 'ai')
    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: buildInterviewFeedbackPrompt({
        question: lastQuestion?.content || '',
        answer: dto.answer,
        resumeContent: session.resume?.content || '',
      }),
      temperature: 0.3,
      maxTokens: 1800,
    })
    const parsed = safeParseJson<InterviewFeedbackResult>(aiText)
    const feedback = normalizeFeedbackResult(parsed)

    await this.prisma.interviewMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: dto.answer,
      },
    })
    await this.prisma.interviewMessage.create({
      data: {
        sessionId,
        role: 'ai',
        content: feedback.followUpQuestion,
        feedbackJson: feedback as unknown as Prisma.InputJsonValue,
      },
    })

    return {
      sessionId,
      feedback: {
        score: feedback.score,
        comment: feedback.comment,
        problems: feedback.problems,
        betterAnswer: feedback.betterAnswer,
      },
      nextQuestion: feedback.followUpQuestion,
    }
  }

  async finish(sessionId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!session) {
      throw new NotFoundException('Interview session not found')
    }

    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: buildInterviewSummaryPrompt({
        targetRole: session.targetRole || undefined,
        messages: session.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      }),
      temperature: 0.25,
      maxTokens: 1800,
    })
    const parsed = safeParseJson<InterviewSummaryResult>(aiText)
    const summary = normalizeSummaryResult(parsed)

    await this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: 'finished',
        summaryJson: summary as unknown as Prisma.InputJsonValue,
      },
    })

    return {
      sessionId,
      ...summary,
    }
  }
}

function normalizeQuestionResult(
  value: InterviewQuestionResult | { rawText: string; parseError: true },
  dto: CreateInterviewDto,
): InterviewQuestionResult {
  if ('parseError' in value) {
    return {
      question: value.rawText || `请结合你的项目经历，介绍一个最能体现 ${dto.targetRole} 能力的项目。`,
      questionType: dto.interviewType,
      expectedPoints: [],
    }
  }

  return {
    question: String(value.question || `请结合你的项目经历，介绍一个最能体现 ${dto.targetRole} 能力的项目。`),
    questionType: String(value.questionType || dto.interviewType),
    expectedPoints: toStringList(value.expectedPoints),
  }
}

function normalizeFeedbackResult(value: InterviewFeedbackResult | { rawText: string; parseError: true }): InterviewFeedbackResult {
  if ('parseError' in value) {
    return {
      score: 0,
      comment: value.rawText,
      problems: ['AI 返回内容不是合法 JSON，已保留原文。'],
      betterAnswer: '',
      followUpQuestion: '请继续补充你的思路、技术取舍和最终结果。',
    }
  }

  return {
    score: clampScore(value.score),
    comment: String(value.comment || ''),
    problems: toStringList(value.problems),
    betterAnswer: String(value.betterAnswer || ''),
    followUpQuestion: String(value.followUpQuestion || '请继续补充你的思路、技术取舍和最终结果。'),
  }
}

function normalizeSummaryResult(value: InterviewSummaryResult | { rawText: string; parseError: true }): InterviewSummaryResult {
  if ('parseError' in value) {
    return {
      totalScore: 0,
      summary: value.rawText,
      strengths: [],
      weaknesses: ['AI 返回内容不是合法 JSON，已保留原文。'],
      studyPlan: [],
    }
  }

  return {
    totalScore: clampScore(value.totalScore),
    summary: String(value.summary || ''),
    strengths: toStringList(value.strengths),
    weaknesses: toStringList(value.weaknesses),
    studyPlan: toStringList(value.studyPlan),
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
