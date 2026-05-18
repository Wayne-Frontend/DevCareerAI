import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InterviewMessage, InterviewSession, Prisma, Resume } from '@prisma/client'
import { getAiResultStatus } from '../../common/utils/ai-result-status.util'
import { safeParseJson } from '../../common/utils/json-response.util'
import { AI_TEXT_LIMITS, limitTextForAi } from '../../common/utils/text-limit.util'
import { AiCacheService } from '../ai/ai-cache.service'
import { AiService } from '../ai/ai.service'
import type {
  AiUsage,
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

interface AiStreamCallbacks {
  signal?: AbortSignal
  onDelta?: (delta: string) => void
  onUsage?: (usage: AiUsage) => void
}

type SessionWithMessages = InterviewSession & {
  resume: Resume | null
  messages: InterviewMessage[]
}

@Injectable()
export class InterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly aiCacheService: AiCacheService,
  ) {}

  async create(dto: CreateInterviewDto, userId: string) {
    const resumeRecord = await this.resolveResume(dto, userId)
    const jobDescription = await this.resolveJobDescription(dto, userId)
    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildQuestionPrompt(dto),
      temperature: 0.35,
      maxTokens: 1200,
      modelTier: 'fast',
    })
    const parsed = safeParseJson<InterviewQuestionResult>(aiText)
    const status = getAiResultStatus(parsed)
    const question = normalizeQuestionResult(parsed, dto)

    return {
      ...(await this.createSession(dto, resumeRecord.id, jobDescription?.id, question, userId)),
      meta: { status },
    }
  }

  async createStream(dto: CreateInterviewDto, userId: string, callbacks: AiStreamCallbacks = {}) {
    const resumeRecord = await this.resolveResume(dto, userId)
    const jobDescription = await this.resolveJobDescription(dto, userId)
    const model = this.aiService.getModel('fast')
    const cachePayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildQuestionPrompt(dto),
      temperature: 0.35,
      maxTokens: 1200,
    }
    const cached = await this.aiCacheService.get<InterviewQuestionResult>({
      feature: 'interview-question',
      model,
      version: 'interview-question-v1',
      payload: cachePayload,
    })
    const generated = cached
      ? { result: cached.result, status: 'success' as const }
      : await this.generateQuestion({
          cachePayload,
          model,
          dto,
          callbacks,
        })
    const response = await this.createSession(dto, resumeRecord.id, jobDescription?.id, generated.result, userId)

    return {
      ...response,
      cached: Boolean(cached),
      meta: {
        cached: Boolean(cached),
        status: generated.status,
      },
    }
  }

  async submitAnswer(sessionId: string, dto: SubmitAnswerDto, userId: string) {
    const session = await this.findSession(sessionId, userId)
    this.assertOngoingSession(session)
    const feedback = await this.requestFeedback(session, dto)
    await this.createAnswerMessages(sessionId, dto.answer, feedback)

    return toMessageResponse(sessionId, feedback)
  }

  async submitAnswerStream(sessionId: string, dto: SubmitAnswerDto, userId: string, callbacks: AiStreamCallbacks = {}) {
    const session = await this.findSession(sessionId, userId)
    this.assertOngoingSession(session)
    const lastQuestion = [...session.messages].reverse().find((message) => message.role === 'ai')
    const model = this.aiService.getModel('fast')
    const cachePayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildFeedbackPrompt(session, dto.answer, lastQuestion?.content || ''),
      temperature: 0.3,
      maxTokens: 1800,
    }
    const cached = await this.aiCacheService.get<InterviewFeedbackResult>({
      feature: 'interview-feedback',
      model,
      version: 'interview-feedback-v1',
      payload: cachePayload,
    })
    const generated = cached
      ? { result: cached.result, status: 'success' as const }
      : await this.generateFeedback({
          cachePayload,
          model,
          callbacks,
        })
    const feedback = generated.result

    await this.createAnswerMessages(sessionId, dto.answer, feedback)

    return {
      ...toMessageResponse(sessionId, feedback),
      cached: Boolean(cached),
      meta: {
        cached: Boolean(cached),
        status: generated.status,
      },
    }
  }

  async finish(sessionId: string, userId: string) {
    const session = await this.findSession(sessionId, userId, false)
    this.assertOngoingSession(session)
    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildSummaryPrompt(session),
      temperature: 0.25,
      maxTokens: 1800,
      modelTier: 'fast',
    })
    const parsed = safeParseJson<InterviewSummaryResult>(aiText)
    const status = getAiResultStatus(parsed)
    const summary = normalizeSummaryResult(parsed)

    await this.finishSession(sessionId, userId, summary)

    return {
      sessionId,
      ...summary,
      meta: { status },
    }
  }

  async finishStream(sessionId: string, userId: string, callbacks: AiStreamCallbacks = {}) {
    const session = await this.findSession(sessionId, userId, false)
    this.assertOngoingSession(session)
    const model = this.aiService.getModel('fast')
    const cachePayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildSummaryPrompt(session),
      temperature: 0.25,
      maxTokens: 1800,
    }
    const cached = await this.aiCacheService.get<InterviewSummaryResult>({
      feature: 'interview-summary',
      model,
      version: 'interview-summary-v1',
      payload: cachePayload,
    })
    const generated = cached
      ? { result: cached.result, status: 'success' as const }
      : await this.generateSummary({
          cachePayload,
          model,
          callbacks,
        })
    const summary = generated.result

    await this.finishSession(sessionId, userId, summary)

    return {
      sessionId,
      ...summary,
      cached: Boolean(cached),
      meta: {
        cached: Boolean(cached),
        status: generated.status,
      },
    }
  }

  private async resolveResume(dto: CreateInterviewDto, userId: string) {
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
        title: `${dto.targetRole} 模拟面试简历`,
        content: dto.resumeContent,
        targetRole: dto.targetRole,
      },
    })
  }

  private async resolveJobDescription(dto: CreateInterviewDto, userId: string) {
    if (dto.jobDescriptionId) {
      const jobDescription = await this.prisma.jobDescription.findFirst({ where: { id: dto.jobDescriptionId, userId } })

      if (!jobDescription) {
        throw new NotFoundException('Job description not found')
      }

      return jobDescription
    }

    if (dto.jobDescription) {
      return this.prisma.jobDescription.create({
        data: {
          userId,
          jobTitle: dto.targetRole,
          content: dto.jobDescription,
        },
      })
    }

    return null
  }

  private buildQuestionPrompt(dto: CreateInterviewDto) {
    return buildInterviewQuestionPrompt({
      ...dto,
      resumeContent: limitTextForAi(dto.resumeContent, AI_TEXT_LIMITS.resume),
      jobDescription: dto.jobDescription
        ? limitTextForAi(dto.jobDescription, AI_TEXT_LIMITS.jobDescription)
        : undefined,
    })
  }

  private buildFeedbackPrompt(session: SessionWithMessages, answer: string, question: string) {
    return buildInterviewFeedbackPrompt({
      question,
      answer: limitTextForAi(answer, AI_TEXT_LIMITS.answer),
      resumeContent: limitTextForAi(session.resume?.content || '', AI_TEXT_LIMITS.resume),
    })
  }

  private buildSummaryPrompt(session: Pick<InterviewSession, 'targetRole'> & { messages: InterviewMessage[] }) {
    const prompt = buildInterviewSummaryPrompt({
      targetRole: session.targetRole || undefined,
      messages: session.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    })

    return limitTextForAi(prompt, AI_TEXT_LIMITS.transcript)
  }

  private async createSession(
    dto: CreateInterviewDto,
    resumeId: string,
    jobDescriptionId: string | undefined,
    question: InterviewQuestionResult,
    userId: string,
  ) {
    const session = await this.prisma.interviewSession.create({
      data: {
        userId,
        resumeId,
        jobDescriptionId,
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

  private async findSession(sessionId: string, userId: string, includeResume = true): Promise<SessionWithMessages> {
    const session = await this.prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        resume: includeResume,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!session) {
      throw new NotFoundException('Interview session not found')
    }

    return session as SessionWithMessages
  }

  private async requestFeedback(session: SessionWithMessages, dto: SubmitAnswerDto) {
    const lastQuestion = [...session.messages].reverse().find((message) => message.role === 'ai')
    const aiText = await this.aiService.chat({
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildFeedbackPrompt(session, dto.answer, lastQuestion?.content || ''),
      temperature: 0.3,
      maxTokens: 1800,
      modelTier: 'fast',
    })

    return normalizeFeedbackResult(safeParseJson<InterviewFeedbackResult>(aiText))
  }

  private async generateQuestion(params: {
    cachePayload: {
      systemPrompt: string
      userPrompt: string
      temperature: number
      maxTokens: number
    }
    model: string
    dto: CreateInterviewDto
    callbacks: AiStreamCallbacks
  }) {
    const stream = await this.aiService.chatStream({
      ...params.cachePayload,
      modelTier: 'fast',
      signal: params.callbacks.signal,
      onDelta: params.callbacks.onDelta,
      onUsage: params.callbacks.onUsage,
    })
    const parsed = safeParseJson<InterviewQuestionResult>(stream.text)
    const status = getAiResultStatus(parsed)
    const result = normalizeQuestionResult(parsed, params.dto)

    await this.aiCacheService.set({
      feature: 'interview-question',
      model: params.model,
      version: 'interview-question-v1',
      payload: params.cachePayload,
      result,
      rawText: stream.text,
    })

    return { result, status }
  }

  private async generateFeedback(params: {
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
      modelTier: 'fast',
      signal: params.callbacks.signal,
      onDelta: params.callbacks.onDelta,
      onUsage: params.callbacks.onUsage,
    })
    const parsed = safeParseJson<InterviewFeedbackResult>(stream.text)
    const status = getAiResultStatus(parsed)
    const result = normalizeFeedbackResult(parsed)

    await this.aiCacheService.set({
      feature: 'interview-feedback',
      model: params.model,
      version: 'interview-feedback-v1',
      payload: params.cachePayload,
      result,
      rawText: stream.text,
    })

    return { result, status }
  }

  private async generateSummary(params: {
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
      modelTier: 'fast',
      signal: params.callbacks.signal,
      onDelta: params.callbacks.onDelta,
      onUsage: params.callbacks.onUsage,
    })
    const parsed = safeParseJson<InterviewSummaryResult>(stream.text)
    const status = getAiResultStatus(parsed)
    const result = normalizeSummaryResult(parsed)

    await this.aiCacheService.set({
      feature: 'interview-summary',
      model: params.model,
      version: 'interview-summary-v1',
      payload: params.cachePayload,
      result,
      rawText: stream.text,
    })

    return { result, status }
  }

  private async createAnswerMessages(sessionId: string, answer: string, feedback: InterviewFeedbackResult) {
    await this.prisma.interviewMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: answer,
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
  }

  private finishSession(sessionId: string, userId: string, summary: InterviewSummaryResult) {
    return this.prisma.interviewSession.updateMany({
      where: { id: sessionId, userId },
      data: {
        status: 'finished',
        summaryJson: summary as unknown as Prisma.InputJsonValue,
      },
    })
  }

  private assertOngoingSession(session: Pick<InterviewSession, 'status'>) {
    if (session.status !== 'ongoing') {
      throw new ConflictException('面试已结束，不能继续操作')
    }
  }
}

function toMessageResponse(sessionId: string, feedback: InterviewFeedbackResult) {
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
