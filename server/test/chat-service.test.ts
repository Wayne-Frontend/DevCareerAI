import { deepEqual, equal, match, ok, rejects } from 'node:assert/strict'
import { test } from 'vitest'
import { NotFoundException } from '@nestjs/common'
import { ChatService } from '../src/modules/chat/chat.service'
import type { PrismaService } from '../src/prisma/prisma.service'
import type { AiService } from '../src/modules/ai/ai.service'
import type { ChatOptions } from '../src/modules/ai/ai.types'

interface SessionSeed {
  id?: string
  title?: string | null
  messages?: Array<{ role: 'user' | 'ai'; content: string }>
}

/** 组一个最小可用的 ChatService：手写 prisma/aiService stub，捕获调用参数供断言。 */
function createService(seed: SessionSeed | null = { messages: [] }) {
  const captured: {
    aiOptions: ChatOptions | null
    createdMessages: Array<Record<string, unknown>>
    sessionUpdate: Record<string, unknown> | null
  } = { aiOptions: null, createdMessages: [], sessionUpdate: null }

  const session = seed
    ? {
        id: seed.id ?? 's1',
        userId: 'u1',
        title: seed.title ?? null,
        resume: null,
        jobDescription: null,
        messages: (seed.messages ?? []).map((message, index) => ({
          id: `m${index}`,
          sessionId: seed.id ?? 's1',
          role: message.role,
          content: message.content,
          createdAt: new Date(index),
        })),
      }
    : null

  const prisma = {
    chatSession: {
      findFirst: async () => session,
      deleteMany: async () => ({ count: session ? 1 : 0 }),
      update: async (args: { data: Record<string, unknown> }) => {
        captured.sessionUpdate = args.data
        return session
      },
    },
    chatMessage: {
      create: async (args: { data: Record<string, unknown> }) => {
        captured.createdMessages.push(args.data)
        return { id: `new-${captured.createdMessages.length}`, ...args.data, createdAt: new Date() }
      },
    },
    resume: { findFirst: async () => null },
    jobDescription: { findFirst: async () => null },
    // persistExchange 用数组形式的 $transaction，这里直接等待全部操作完成即可
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  } as unknown as PrismaService

  const aiService = {
    chat: async (options: ChatOptions) => {
      captured.aiOptions = options
      return 'AI 回复'
    },
  } as unknown as AiService

  return { service: new ChatService(prisma, aiService), captured }
}

test('createSession：引用非本人的简历时抛 NotFound，不落库', async () => {
  const { service } = createService()

  await rejects(
    () => service.createSession({ resumeId: 'other-users-resume' }, 'u1'),
    NotFoundException,
  )
})

test('sendMessage：首条消息用其内容生成标题，超过 20 字符截断并加省略号', async () => {
  const { service, captured } = createService({ messages: [] })
  const content = '这是一条明显超过二十个字符长度限制的用户提问内容'

  const result = await service.sendMessage('s1', { content }, 'u1')

  equal(result.title, `${content.slice(0, 20)}…`)
  equal(captured.sessionUpdate?.title, result.title)
  // 用户消息与 AI 回复各落一条
  deepEqual(
    captured.createdMessages.map((message) => message.role),
    ['user', 'ai'],
  )
})

test('sendMessage：标题生成会折叠空白，纯空白内容回退为默认标题', async () => {
  const first = createService({ messages: [] })
  await first.service.sendMessage('s1', { content: '  你好\n\n世界  ' }, 'u1')
  equal(first.captured.sessionUpdate?.title, '你好 世界')

  const second = createService({ messages: [] })
  const result = await second.service.sendMessage('s1', { content: '   ' }, 'u1')
  equal(result.title, '新的会话')
})

test('sendMessage：非首条消息保留原标题', async () => {
  const { service, captured } = createService({
    title: '既有标题',
    messages: [{ role: 'user', content: 'hi' }],
  })

  const result = await service.sendMessage('s1', { content: '继续聊' }, 'u1')

  equal(result.title, '既有标题')
  equal(captured.sessionUpdate?.title, '既有标题')
})

test('sendMessage：历史只携带最近 20 条，且 ai 角色映射为 assistant', async () => {
  const messages = Array.from({ length: 30 }, (_, index) => ({
    role: (index % 2 === 0 ? 'user' : 'ai') as 'user' | 'ai',
    content: `msg-${index}`,
  }))
  const { service, captured } = createService({ messages })

  await service.sendMessage('s1', { content: '新问题' }, 'u1')

  const turns = captured.aiOptions?.messages ?? []
  // 20 条历史 + 本次用户输入
  equal(turns.length, 21)
  // 裁剪保留的是最近的 20 条（msg-10 起）
  equal(turns[0].content, 'msg-10')
  equal(turns[20].content, '新问题')
  ok(turns.slice(0, 20).every((turn) => turn.role === 'user' || turn.role === 'assistant'))
  match(turns.find((turn) => turn.content === 'msg-11')?.role ?? '', /^assistant$/)
})

test('deleteSession：不存在或不属于当前用户时抛 NotFound', async () => {
  const { service } = createService(null)

  await rejects(() => service.deleteSession('missing', 'u1'), NotFoundException)
})
