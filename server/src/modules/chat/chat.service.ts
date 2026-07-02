import { Injectable, NotFoundException } from '@nestjs/common'
import { ChatMessage, ChatSession, JobDescription, Resume } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AiService } from '../ai/ai.service'
import type { AiStreamCallbacks, ChatTurn } from '../ai/ai.types'
import { buildChatSystemPrompt } from '../../prompts/chat.prompt'
import { CreateChatSessionDto } from './dto/create-chat-session.dto'
import { SendChatMessageDto } from './dto/send-chat-message.dto'
import { UpdateChatSessionDto } from './dto/update-chat-session.dto'

// 携带给模型的历史消息上限（条数，含用户与 AI 双方），避免长对话 token 膨胀。
const MAX_HISTORY_MESSAGES = 20
// 会话标题取首条用户消息的前缀。
const TITLE_MAX_LENGTH = 20

type SessionWithContext = ChatSession & {
  resume: Resume | null
  jobDescription: JobDescription | null
  messages: ChatMessage[]
}

const sessionListSelect = {
  id: true,
  title: true,
  resumeId: true,
  jobDescriptionId: true,
  createdAt: true,
  updatedAt: true,
  resume: { select: { id: true, title: true } },
  jobDescription: { select: { id: true, jobTitle: true, companyName: true } },
} as const

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async createSession(dto: CreateChatSessionDto, userId: string) {
    await this.assertResumeOwnership(dto.resumeId, userId)
    await this.assertJobDescriptionOwnership(dto.jobDescriptionId, userId)

    return this.prisma.chatSession.create({
      data: {
        userId,
        resumeId: dto.resumeId,
        jobDescriptionId: dto.jobDescriptionId,
      },
      select: sessionListSelect,
    })
  }

  listSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: sessionListSelect,
    })
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      select: {
        ...sessionListSelect,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Chat session not found')
    }

    return session
  }

  async updateSession(sessionId: string, dto: UpdateChatSessionDto, userId: string) {
    await this.findSession(sessionId, userId)

    if (dto.resumeId) {
      await this.assertResumeOwnership(dto.resumeId, userId)
    }
    if (dto.jobDescriptionId) {
      await this.assertJobDescriptionOwnership(dto.jobDescriptionId, userId)
    }

    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.resumeId !== undefined ? { resumeId: dto.resumeId } : {}),
        ...(dto.jobDescriptionId !== undefined ? { jobDescriptionId: dto.jobDescriptionId } : {}),
      },
      select: sessionListSelect,
    })
  }

  async deleteSession(sessionId: string, userId: string) {
    const { count } = await this.prisma.chatSession.deleteMany({ where: { id: sessionId, userId } })

    if (count === 0) {
      throw new NotFoundException('Chat session not found')
    }

    return { deleted: true }
  }

  async sendMessage(sessionId: string, dto: SendChatMessageDto, userId: string) {
    const session = await this.findSession(sessionId, userId)
    const reply = await this.aiService.chat(this.buildAiOptions(session, dto.content, userId))
    return this.persistExchange(session, dto.content, reply)
  }

  async sendMessageStream(sessionId: string, dto: SendChatMessageDto, userId: string, callbacks: AiStreamCallbacks = {}) {
    const session = await this.findSession(sessionId, userId)
    const stream = await this.aiService.chatStream({
      ...this.buildAiOptions(session, dto.content, userId),
      signal: callbacks.signal,
      onDelta: callbacks.onDelta,
      onUsage: callbacks.onUsage,
    })
    return this.persistExchange(session, dto.content, stream.text)
  }

  private buildAiOptions(session: SessionWithContext, content: string, userId: string) {
    return {
      systemPrompt: buildChatSystemPrompt({
        resume: session.resume,
        jobDescription: session.jobDescription,
      }),
      messages: [...this.toHistoryTurns(session.messages), { role: 'user' as const, content }],
      // 对话场景需要自然的文本输出；自由聊天不走 AI 结果缓存（每条消息几乎不会重复）。
      responseFormat: 'text' as const,
      temperature: 0.7,
      maxTokens: 2000,
      modelTier: 'quality' as const,
      feature: 'chat',
      userId,
    }
  }

  private toHistoryTurns(messages: ChatMessage[]): ChatTurn[] {
    return messages.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
      role: message.role === 'ai' ? ('assistant' as const) : ('user' as const),
      content: message.content,
    }))
  }

  /**
   * AI 回复成功后一次性落库：用户消息 + AI 消息；首条消息时用其前缀作为会话标题。
   * 会话 updatedAt 随之更新，供列表按最近活跃排序。
   */
  private async persistExchange(session: SessionWithContext, content: string, reply: string) {
    const isFirstMessage = session.messages.length === 0
    const title = isFirstMessage ? toSessionTitle(content) : session.title

    const [userMessage, aiMessage] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { sessionId: session.id, role: 'user', content },
        select: { id: true, role: true, content: true, createdAt: true },
      }),
      this.prisma.chatMessage.create({
        data: { sessionId: session.id, role: 'ai', content: reply },
        select: { id: true, role: true, content: true, createdAt: true },
      }),
      this.prisma.chatSession.update({
        where: { id: session.id },
        data: { title },
      }),
    ])

    return {
      sessionId: session.id,
      title,
      userMessage,
      aiMessage,
    }
  }

  private async findSession(sessionId: string, userId: string): Promise<SessionWithContext> {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        resume: true,
        jobDescription: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!session) {
      throw new NotFoundException('Chat session not found')
    }

    return session
  }

  private async assertResumeOwnership(resumeId: string | undefined, userId: string) {
    if (!resumeId) return

    const resume = await this.prisma.resume.findFirst({ where: { id: resumeId, userId }, select: { id: true } })
    if (!resume) {
      throw new NotFoundException('Resume not found')
    }
  }

  private async assertJobDescriptionOwnership(jobDescriptionId: string | undefined, userId: string) {
    if (!jobDescriptionId) return

    const jobDescription = await this.prisma.jobDescription.findFirst({
      where: { id: jobDescriptionId, userId },
      select: { id: true },
    })
    if (!jobDescription) {
      throw new NotFoundException('Job description not found')
    }
  }
}

function toSessionTitle(content: string) {
  const compact = content.replace(/\s+/g, ' ').trim()
  return compact.length > TITLE_MAX_LENGTH ? `${compact.slice(0, TITLE_MAX_LENGTH)}…` : compact || '新的会话'
}
