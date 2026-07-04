import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InterviewMessage, InterviewSession, Prisma, Resume } from '@prisma/client'
import { getAiResultStatus } from '../../common/utils/ai-result-status.util'
import { applyStrictJsonRetry } from '../../common/utils/ai-retry.util'
import { safeParseJson } from '../../common/utils/json-response.util'
import { clampScore, toStringList } from '../../common/utils/normalize.util'
import { AI_TEXT_LIMITS, limitTextForAi } from '../../common/utils/text-limit.util'
import { AiCacheService } from '../ai/ai-cache.service'
import { AiService } from '../ai/ai.service'
import type {
  AiResultStatus,
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

// 点评/总结缓存按用户隔离且只保留 1 天：仅用于防重复提交扣费，不追求长期复用。
const INTERVIEW_CACHE_TTL_MS = 24 * 60 * 60 * 1000
// summarizing 过渡态的兜底回滚时长：AI 调用最长 2 分钟，超过 10 分钟仍未完成视为进程异常残留。
export const SUMMARIZING_STALE_MS = 10 * 60 * 1000

type SessionWithMessages = InterviewSession & {
  resume: Resume | null
  messages: InterviewMessage[]
}

type FinishResponse = InterviewSummaryResult & {
  sessionId: string
  cached: boolean
  meta: { cached: boolean; status: AiResultStatus; retried?: boolean }
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
    return this.produceFeedback(session, dto, userId, (payload) => this.chatText(payload, meta))
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
    return this.produceFeedback(session, dto, userId, (payload) =>
      this.streamText(payload, callbacks, meta),
    )
  }

  async finish(sessionId: string, userId: string) {
    const meta: AiCallMeta = { feature: 'interview-summary', userId }
    return this.finishWithClaim(sessionId, userId, (session) =>
      this.produceSummary(session, userId, (payload) => this.chatText(payload, meta)),
    )
  }

  async finishStream(sessionId: string, userId: string, callbacks: AiStreamCallbacks = {}) {
    const meta: AiCallMeta = { feature: 'interview-summary', userId }
    return this.finishWithClaim(sessionId, userId, (session) =>
      this.produceSummary(session, userId, (payload) => this.streamText(payload, callbacks, meta)),
    )
  }

  /**
   * finish 的幂等收口：AI 生成总结耗时数秒，重复点击/并发请求会触发双份生成与覆盖。
   * 先把 status 从 ongoing 原子置为 summarizing（条件更新，只有一个请求能成功），
   * 输掉竞争或会话已结束的请求直接复用库里已有的总结；生成失败则回滚为 ongoing 允许重试。
   */
  private async finishWithClaim(
    sessionId: string,
    userId: string,
    produce: (session: SessionWithMessages) => Promise<FinishResponse>,
  ): Promise<FinishResponse> {
    const session = await this.findSession(sessionId, userId, false)

    if (session.status === 'finished') {
      return this.toExistingSummaryResponse(session)
    }
    if (session.status !== 'ongoing') {
      throw new ConflictException('面试总结正在生成中，请稍候刷新查看')
    }

    const claimed = await this.prisma.interviewSession.updateMany({
      where: { id: sessionId, userId, status: 'ongoing' },
      data: { status: 'summarizing' },
    })

    if (claimed.count === 0) {
      // 检查与抢占之间被并发请求先行处理：已完成则复用结果，仍在生成中则提示等待。
      const latest = await this.findSession(sessionId, userId, false)
      if (latest.status === 'finished') {
        return this.toExistingSummaryResponse(latest)
      }
      throw new ConflictException('面试总结正在生成中，请稍候刷新查看')
    }

    try {
      return await produce(session)
    } catch (error) {
      // 生成失败回滚为 ongoing，允许用户重试；只回滚仍处于 summarizing 的会话。
      await this.prisma.interviewSession.updateMany({
        where: { id: sessionId, userId, status: 'summarizing' },
        data: { status: 'ongoing' },
      })
      throw error
    }
  }

  private toExistingSummaryResponse(session: SessionWithMessages): FinishResponse {
    const summary = session.summaryJson
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
      throw new ConflictException('面试已结束，不能继续操作')
    }

    return {
      sessionId: session.id,
      ...normalizeSummaryResult(summary as unknown as InterviewSummaryResult),
      cached: true,
      meta: { cached: true, status: 'success' },
    }
  }

  private async produceQuestion(dto: CreateInterviewDto, userId: string, getText: GetText) {
    const resumeRecord = await this.resolveResume(dto, userId)
    const jobDescription = await this.resolveJobDescription(dto, userId)
    const payload: InterviewPayload = {
      systemPrompt: CAREER_ASSISTANT_SYSTEM_PROMPT,
      userPrompt: this.buildQuestionPrompt(dto),
      temperature: 0.35,
      maxTokens: 1200,
    }

    // 出题刻意不走缓存：同一简历+岗位反复发起面试时应拿到不同的题目，多样性优先于省钱（fast 模型单次成本很低）。
    let parsed = safeParseJson<InterviewQuestionResult>(await getText(payload))
    let retried = false
    if ('parseError' in parsed) {
      // 解析失败自动重试一次（与缓存路径的 resolve 重试策略一致）。
      retried = true
      parsed = safeParseJson<InterviewQuestionResult>(
        await getText(applyStrictJsonRetry(payload, { retry: true })),
      )
    }
    const result = normalizeQuestionResult(parsed, dto)
    const status = getAiResultStatus(parsed)

    const response = await this.createSession(
      dto,
      resumeRecord.id,
      jobDescription?.id,
      result,
      userId,
    )

    return {
      ...response,
      cached: false,
      meta: { cached: false, status, retried },
    }
  }

  private async produceFeedback(
    session: SessionWithMessages,
    dto: SubmitAnswerDto,
    userId: string,
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

    const { result, cached, status, retried } =
      await this.aiCacheService.resolve<InterviewFeedbackResult>(
        {
          feature: 'interview-feedback',
          model,
          version: 'interview-feedback-v3',
          userId,
          ttlMs: INTERVIEW_CACHE_TTL_MS,
          payload,
        },
        async (attempt) => {
          const text = await getText(applyStrictJsonRetry(payload, attempt))
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
      meta: { cached, status, retried },
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

    const { result, cached, status, retried } =
      await this.aiCacheService.resolve<InterviewSummaryResult>(
        {
          feature: 'interview-summary',
          model,
          version: 'interview-summary-v3',
          userId,
          ttlMs: INTERVIEW_CACHE_TTL_MS,
          payload,
        },
        async (attempt) => {
          const text = await getText(applyStrictJsonRetry(payload, attempt))
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
      meta: { cached, status, retried },
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
            seq: 1,
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
        messages: { orderBy: [{ seq: 'asc' }, { createdAt: 'asc' }] as const },
      },
    })

    if (!session) {
      throw new NotFoundException('Interview session not found')
    }

    return session as SessionWithMessages
  }

  // 用户回答与 AI 反馈必须同事务落库，避免第二次写入失败时留下"有回答、无反馈"的悬挂会话。
  // 顺序由会话内递增的 seq 保证（createdAt 毫秒精度不可靠）；事务内先校验会话仍为 ongoing，
  // 消除"校验后、写入前会话被并发 finish"的 TOCTOU 窗口。
  private async createAnswerMessages(
    sessionId: string,
    answer: string,
    feedback: InterviewFeedbackResult,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const ongoing = await tx.interviewSession.count({
        where: { id: sessionId, status: 'ongoing' },
      })
      if (ongoing === 0) {
        throw new ConflictException('面试已结束，不能继续操作')
      }

      const existing = await tx.interviewMessage.aggregate({
        where: { sessionId },
        _max: { seq: true },
        _count: { _all: true },
      })
      // 老数据 seq 全为 0：用 max(seq) 与消息条数中的较大者续号，保证新消息一定排在其后。
      const nextSeq = Math.max(existing._max.seq ?? 0, existing._count._all) + 1

      await tx.interviewMessage.create({
        data: { sessionId, role: 'user', content: answer, seq: nextSeq },
      })
      await tx.interviewMessage.create({
        data: {
          sessionId,
          role: 'ai',
          content: feedback.followUpQuestion,
          feedbackJson: feedback as unknown as Prisma.InputJsonValue,
          seq: nextSeq + 1,
        },
      })
    })
  }

  // 只允许从 summarizing 收口到 finished（finishWithClaim 已抢占），防止并发覆盖已有总结。
  private finishSession(sessionId: string, userId: string, summary: InterviewSummaryResult) {
    return this.prisma.interviewSession.updateMany({
      where: { id: sessionId, userId, status: 'summarizing' },
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
