import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InterviewMessage, InterviewSession, Prisma, Resume } from '@prisma/client'
import { getAiResultStatus } from '../../common/utils/ai-result-status.util'
import { safeParseJson } from '../../common/utils/json-response.util'
import { clampScore, toStringList } from '../../common/utils/normalize.util'
import { AI_TEXT_LIMITS, limitTextForAi } from '../../common/utils/text-limit.util'
import { AiCacheService } from '../ai/ai-cache.service'
import { AiService } from '../ai/ai.service'
import type {
  AiStreamCallbacks,
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

interface InterviewPayload {
  systemPrompt: string
  userPrompt: string
  temperature: number
  maxTokens: number
}

// 用量埋点上下文：面试三个阶段的 feature 不同，需随调用透传。
interface AiCallMeta {
  feature: string
  userId: string
}

type GetText = (payload: InterviewPayload) => Promise<string>

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

  // 会话列表按最近活跃排序，供前端"继续上次面试"与历史入口使用。
  async listSessions(userId: string) {
    const sessions = await this.prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    })

    return sessions.map((session) => toSessionSummary(session, session._count.messages))
  }

  // 会话详情含完整问答与逐题点评，用于恢复进行中的会话和复盘回放。
  async getSession(sessionId: string, userId: string) {
    const session = await this.findSession(sessionId, userId, false)

    return {
      ...toSessionSummary(session, session.messages.length),
      messages: session.messages.map(toSessionMessage),
      summary: session.summaryJson ?? null,
    }
  }

  async create(dto: CreateInterviewDto, userId: string) {
    const meta: AiCallMeta = { feature: 'interview-question', userId }
    return this.produceQuestion(dto, userId, (payload) => this.chatText(payload, meta))
  }

  async createStream(dto: CreateInterviewDto, userId: string, callbacks: AiStreamCallbacks = {}) {
    const meta: AiCallMeta = { feature: 'interview-question', userId }
    return this.produceQuestion(dto, userId, (payload) => this.streamText(payload, callbacks, meta))
  }

  async submitAnswer(sessionId: string, dto: SubmitAnswerDto, userId: string) {
    const session = await this.findSession(sessionId, userId)
    this.assertOngoingSession(session)

    const meta: AiCallMeta = { feature: 'interview-feedback', userId }
    return this.produceFeedback(session, dto, (payload) => this.chatText(payload, meta))
  }

  async submitAnswerStream(
    sessionId: string,
    dto: SubmitAnswerDto,
    userId: string,
    callbacks: AiStreamCallbacks = {},
  ) {
    const session = await this.findSession(sessionId, userId)
    this.assertOngoingSession(session)

    const meta: AiCallMeta = { feature: 'interview-feedback', userId }
    return this.produceFeedback(session, dto, (payload) =>
      this.streamText(payload, callbacks, meta),
    )
  }

  async finish(sessionId: string, userId: string) {
    const session = await this.findSession(sessionId, userId, false)
    this.assertOngoingSession(session)

    const meta: AiCallMeta = { feature: 'interview-summary', userId }
    return this.produceSummary(session, userId, (payload) => this.chatText(payload, meta))
  }

  async finishStream(sessionId: string, userId: string, callbacks: AiStreamCallbacks = {}) {
    const session = await this.findSession(sessionId, userId, false)
    this.assertOngoingSession(session)

    const meta: AiCallMeta = { feature: 'interview-summary', userId }
    return this.produceSummary(session, userId, (payload) =>
      this.streamText(payload, callbacks, meta),
    )
  }

  private async produceQuestion(dto: CreateInterviewDto, userId: string, getText: GetText) {
    const resumeRecord = await this.resolveResume(dto, userId)
    const jobDescription = await this.resolveJobDescription(dto, userId)
    const model = this.aiService.getModel('fast')
    const payload: InterviewPayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildQuestionPrompt(dto),
      temperature: 0.35,
      maxTokens: 1200,
    }

    const { result, cached, status } = await this.aiCacheService.resolve<InterviewQuestionResult>(
      { feature: 'interview-question', model, version: 'interview-question-v3', payload },
      async () => {
        const text = await getText(payload)
        const parsed = safeParseJson<InterviewQuestionResult>(text)
        return {
          result: normalizeQuestionResult(parsed, dto),
          rawText: text,
          status: getAiResultStatus(parsed),
        }
      },
    )

    const response = await this.createSession(
      dto,
      resumeRecord.id,
      jobDescription?.id,
      result,
      userId,
    )

    return {
      ...response,
      cached,
      meta: { cached, status },
    }
  }

  private async produceFeedback(
    session: SessionWithMessages,
    dto: SubmitAnswerDto,
    getText: GetText,
  ) {
    const lastQuestion = [...session.messages].reverse().find((message) => message.role === 'ai')
    const model = this.aiService.getModel('fast')
    const payload: InterviewPayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildFeedbackPrompt(session, dto.answer, lastQuestion?.content || ''),
      temperature: 0.3,
      maxTokens: 1800,
    }

    const { result, cached, status } = await this.aiCacheService.resolve<InterviewFeedbackResult>(
      { feature: 'interview-feedback', model, version: 'interview-feedback-v3', payload },
      async () => {
        const text = await getText(payload)
        const parsed = safeParseJson<InterviewFeedbackResult>(text)
        return {
          result: normalizeFeedbackResult(parsed),
          rawText: text,
          status: getAiResultStatus(parsed),
        }
      },
    )

    await this.createAnswerMessages(session.id, dto.answer, result)

    return {
      ...toMessageResponse(session.id, result),
      cached,
      meta: { cached, status },
    }
  }

  private async produceSummary(session: SessionWithMessages, userId: string, getText: GetText) {
    const model = this.aiService.getModel('fast')
    const payload: InterviewPayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildSummaryPrompt(session),
      temperature: 0.25,
      maxTokens: 1800,
    }

    const { result, cached, status } = await this.aiCacheService.resolve<InterviewSummaryResult>(
      { feature: 'interview-summary', model, version: 'interview-summary-v3', payload },
      async () => {
        const text = await getText(payload)
        const parsed = safeParseJson<InterviewSummaryResult>(text)
        return {
          result: normalizeSummaryResult(parsed),
          rawText: text,
          status: getAiResultStatus(parsed),
        }
      },
    )

    await this.finishSession(session.id, userId, result)

    return {
      sessionId: session.id,
      ...result,
      cached,
      meta: { cached, status },
    }
  }

  private chatText(payload: InterviewPayload, meta: AiCallMeta): Promise<string> {
    return this.aiService.chat({
      ...payload,
      modelTier: 'fast',
      feature: meta.feature,
      userId: meta.userId,
    })
  }

  private async streamText(
    payload: InterviewPayload,
    callbacks: AiStreamCallbacks,
    meta: AiCallMeta,
  ): Promise<string> {
    const stream = await this.aiService.chatStream({
      ...payload,
      modelTier: 'fast',
      feature: meta.feature,
      userId: meta.userId,
      signal: callbacks.signal,
      onDelta: callbacks.onDelta,
      onUsage: callbacks.onUsage,
    })
    return stream.text
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
        source: 'auto',
      },
    })
  }

  private async resolveJobDescription(dto: CreateInterviewDto, userId: string) {
    if (dto.jobDescriptionId) {
      const jobDescription = await this.prisma.jobDescription.findFirst({
        where: { id: dto.jobDescriptionId, userId },
      })

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
          source: 'auto',
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

  private buildSummaryPrompt(
    session: Pick<InterviewSession, 'targetRole'> & { messages: InterviewMessage[] },
  ) {
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

  private async findSession(
    sessionId: string,
    userId: string,
    includeResume = true,
  ): Promise<SessionWithMessages> {
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

  // 用户回答与 AI 反馈必须同事务落库，避免第二次写入失败时留下"有回答、无反馈"的悬挂会话。
  // createdAt 显式错开 1ms：事务内两次写入可能落在同一毫秒，按 createdAt 排序时会乱序。
  private async createAnswerMessages(
    sessionId: string,
    answer: string,
    feedback: InterviewFeedbackResult,
  ) {
    const now = new Date()

    await this.prisma.$transaction([
      this.prisma.interviewMessage.create({
        data: {
          sessionId,
          role: 'user',
          content: answer,
          createdAt: now,
        },
      }),
      this.prisma.interviewMessage.create({
        data: {
          sessionId,
          role: 'ai',
          content: feedback.followUpQuestion,
          feedbackJson: feedback as unknown as Prisma.InputJsonValue,
          createdAt: new Date(now.getTime() + 1),
        },
      }),
    ])
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

function toSessionSummary(session: InterviewSession, messageCount: number) {
  return {
    id: session.id,
    title: session.title,
    targetRole: session.targetRole,
    interviewType: session.interviewType,
    difficulty: session.difficulty,
    status: session.status,
    messageCount,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
}

// feedbackJson 有两种形状：首题消息存 {questionType, expectedPoints}，
// 点评消息存完整 InterviewFeedbackResult（含 score）。按是否有 score 区分映射。
function toSessionMessage(message: InterviewMessage) {
  const raw = message.feedbackJson
  const data =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null

  const feedback =
    data && 'score' in data
      ? {
          score: clampScore(data.score),
          comment: String(data.comment || ''),
          problems: toStringList(data.problems),
          betterAnswer: String(data.betterAnswer || ''),
        }
      : undefined

  const expectedPoints =
    data && !feedback && 'expectedPoints' in data ? toStringList(data.expectedPoints) : undefined

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    feedback,
    expectedPoints,
    createdAt: message.createdAt,
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
      question:
        value.rawText || `请结合你的项目经历，介绍一个最能体现 ${dto.targetRole} 能力的项目。`,
      questionType: dto.interviewType,
      expectedPoints: [],
    }
  }

  return {
    question: String(
      value.question || `请结合你的项目经历，介绍一个最能体现 ${dto.targetRole} 能力的项目。`,
    ),
    questionType: String(value.questionType || dto.interviewType),
    expectedPoints: toStringList(value.expectedPoints),
  }
}

export function normalizeFeedbackResult(
  value: InterviewFeedbackResult | { rawText: string; parseError: true },
): InterviewFeedbackResult {
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

export function normalizeSummaryResult(
  value: InterviewSummaryResult | { rawText: string; parseError: true },
): InterviewSummaryResult {
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
