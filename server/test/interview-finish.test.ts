import { deepEqual, equal, ok, rejects } from 'node:assert/strict'
import { test } from 'vitest'
import { ConflictException } from '@nestjs/common'
import { InterviewService } from '../src/modules/interview/interview.service'
import type { AiCacheService } from '../src/modules/ai/ai-cache.service'
import type { AiService } from '../src/modules/ai/ai.service'
import type { PrismaService } from '../src/prisma/prisma.service'

const SUMMARY = {
  totalScore: 82,
  summary: '整体表现良好',
  strengths: ['表达清晰'],
  weaknesses: ['深度不足'],
  studyPlan: ['刷题'],
}

interface MockCalls {
  aiChatCount: number
  updateManyArgs: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }>
}

function buildSession(status: string, summaryJson: unknown = null) {
  return {
    id: 's1',
    userId: 'u1',
    resumeId: null,
    jobDescriptionId: null,
    title: '前端 技术面',
    targetRole: '前端',
    interviewType: '技术面',
    difficulty: 'mid',
    status,
    summaryJson,
    createdAt: new Date(),
    updatedAt: new Date(),
    resume: null,
    messages: [],
  }
}

// 直通缓存桩：resolve 永远执行生成函数（缓存与重试逻辑由 ai-cache.test 单独覆盖）。
const passthroughCache = {
  resolve: async (
    _input: unknown,
    generate: (attempt: {
      retry: boolean
    }) => Promise<{ result: unknown; rawText: string; status: string }>,
  ) => {
    const generated = await generate({ retry: false })
    return { result: generated.result, cached: false, status: generated.status, retried: false }
  },
} as unknown as AiCacheService

function createService(options: {
  findFirstResults: Array<ReturnType<typeof buildSession>>
  claimCount?: number
}) {
  const calls: MockCalls = { aiChatCount: 0, updateManyArgs: [] }
  const findQueue = [...options.findFirstResults]

  const prisma = {
    interviewSession: {
      findFirst: async () => findQueue.shift() ?? null,
      updateMany: async (args: {
        where: Record<string, unknown>
        data: Record<string, unknown>
      }) => {
        calls.updateManyArgs.push(args)
        // 第一次 updateMany 是 claim（ongoing -> summarizing），返回可配置的 count
        if (args.data.status === 'summarizing') {
          return { count: options.claimCount ?? 1 }
        }
        return { count: 1 }
      },
    },
  } as unknown as PrismaService

  const aiService = {
    getModel: () => 'fast-model',
    chat: async () => {
      calls.aiChatCount += 1
      return JSON.stringify(SUMMARY)
    },
  } as unknown as AiService

  const service = new InterviewService(prisma, aiService, passthroughCache)
  return { service, calls }
}

test('finish：ongoing 会话正常生成总结，并以 summarizing 条件收口', async () => {
  const { service, calls } = createService({
    findFirstResults: [buildSession('ongoing')],
  })

  const result = await service.finish('s1', 'u1')

  equal(calls.aiChatCount, 1)
  equal((result as { totalScore: number }).totalScore, 82)
  // 第一次 updateMany 抢占 summarizing，第二次收口 finished 且 where 必须限定 summarizing
  equal(calls.updateManyArgs.length, 2)
  deepEqual(calls.updateManyArgs[0].where, { id: 's1', userId: 'u1', status: 'ongoing' })
  equal(calls.updateManyArgs[1].where.status, 'summarizing')
  equal(calls.updateManyArgs[1].data.status, 'finished')
})

test('finish：已 finished 的会话直接复用已有总结，不再调用 AI', async () => {
  const { service, calls } = createService({
    findFirstResults: [buildSession('finished', SUMMARY)],
  })

  const result = await service.finish('s1', 'u1')

  equal(calls.aiChatCount, 0, '不应二次调用 AI')
  equal(calls.updateManyArgs.length, 0, '不应有任何状态更新')
  equal((result as { totalScore: number }).totalScore, 82)
  equal((result as { cached: boolean }).cached, true)
})

test('finish：抢占失败（并发已完成）时复用赢家的总结', async () => {
  const { service, calls } = createService({
    // 第一次读还是 ongoing，claim 返回 0（输掉竞争），复查时已 finished
    findFirstResults: [buildSession('ongoing'), buildSession('finished', SUMMARY)],
    claimCount: 0,
  })

  const result = await service.finish('s1', 'u1')

  equal(calls.aiChatCount, 0)
  equal((result as { totalScore: number }).totalScore, 82)
})

test('finish：抢占失败且对方仍在生成中时报冲突', async () => {
  const { service } = createService({
    findFirstResults: [buildSession('ongoing'), buildSession('summarizing')],
    claimCount: 0,
  })

  await rejects(() => service.finish('s1', 'u1'), ConflictException)
})

test('finish：summarizing 中的会话直接报冲突，不发起生成', async () => {
  const { service, calls } = createService({
    findFirstResults: [buildSession('summarizing')],
  })

  await rejects(() => service.finish('s1', 'u1'), ConflictException)
  equal(calls.aiChatCount, 0)
})

test('finish：AI 生成失败时回滚为 ongoing 并抛出原错误', async () => {
  const calls: MockCalls = { aiChatCount: 0, updateManyArgs: [] }
  const prisma = {
    interviewSession: {
      findFirst: async () => buildSession('ongoing'),
      updateMany: async (args: {
        where: Record<string, unknown>
        data: Record<string, unknown>
      }) => {
        calls.updateManyArgs.push(args)
        return { count: 1 }
      },
    },
  } as unknown as PrismaService
  const aiService = {
    getModel: () => 'fast-model',
    chat: async () => {
      throw new Error('AI unavailable')
    },
  } as unknown as AiService
  const service = new InterviewService(prisma, aiService, passthroughCache)

  await rejects(() => service.finish('s1', 'u1'), /AI unavailable/)

  const rollback = calls.updateManyArgs[calls.updateManyArgs.length - 1]
  ok(rollback, '应有回滚调用')
  equal(rollback?.data.status, 'ongoing')
  equal(rollback?.where.status, 'summarizing')
})

test('submitAnswer：写入事务内会话已被 finish 时抛冲突（TOCTOU 防护）', async () => {
  const created: Array<Record<string, unknown>> = []
  const tx = {
    interviewSession: {
      count: async () => 0, // 事务内检查：会话已不是 ongoing
    },
    interviewMessage: {
      aggregate: async () => ({ _max: { seq: 2 }, _count: { _all: 2 } }),
      create: async (args: { data: Record<string, unknown> }) => {
        created.push(args.data)
      },
    },
  }
  const prisma = {
    interviewSession: {
      findFirst: async () => ({ ...buildSession('ongoing'), messages: [] }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService
  const aiService = {
    getModel: () => 'fast-model',
    chat: async () =>
      JSON.stringify({
        score: 80,
        comment: 'ok',
        problems: [],
        betterAnswer: '',
        followUpQuestion: '下一题',
      }),
  } as unknown as AiService
  const service = new InterviewService(prisma, aiService, passthroughCache)

  await rejects(() => service.submitAnswer('s1', { answer: '我的回答' }, 'u1'), ConflictException)
  equal(created.length, 0, '冲突时不应写入任何消息')
})

test('submitAnswer：消息按会话内递增 seq 落库', async () => {
  const created: Array<Record<string, unknown>> = []
  const tx = {
    interviewSession: {
      count: async () => 1,
    },
    interviewMessage: {
      aggregate: async () => ({ _max: { seq: 3 }, _count: { _all: 3 } }),
      create: async (args: { data: Record<string, unknown> }) => {
        created.push(args.data)
      },
    },
  }
  const prisma = {
    interviewSession: {
      findFirst: async () => ({ ...buildSession('ongoing'), messages: [] }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService
  const aiService = {
    getModel: () => 'fast-model',
    chat: async () =>
      JSON.stringify({
        score: 80,
        comment: 'ok',
        problems: [],
        betterAnswer: '',
        followUpQuestion: '下一题',
      }),
  } as unknown as AiService
  const service = new InterviewService(prisma, aiService, passthroughCache)

  await service.submitAnswer('s1', { answer: '我的回答' }, 'u1')

  equal(created.length, 2)
  equal(created[0].seq, 4)
  equal(created[0].role, 'user')
  equal(created[1].seq, 5)
  equal(created[1].role, 'ai')
})

test('submitAnswer：老数据 seq 全为 0 时按消息条数续号，保证新消息排在最后', async () => {
  const created: Array<Record<string, unknown>> = []
  const tx = {
    interviewSession: { count: async () => 1 },
    interviewMessage: {
      // 迁移前的老会话：5 条消息、seq 全为 0
      aggregate: async () => ({ _max: { seq: 0 }, _count: { _all: 5 } }),
      create: async (args: { data: Record<string, unknown> }) => {
        created.push(args.data)
      },
    },
  }
  const prisma = {
    interviewSession: {
      findFirst: async () => ({ ...buildSession('ongoing'), messages: [] }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService
  const aiService = {
    getModel: () => 'fast-model',
    chat: async () =>
      JSON.stringify({
        score: 80,
        comment: 'ok',
        problems: [],
        betterAnswer: '',
        followUpQuestion: '下一题',
      }),
  } as unknown as AiService
  const service = new InterviewService(prisma, aiService, passthroughCache)

  await service.submitAnswer('s1', { answer: '答' }, 'u1')

  equal(created[0].seq, 6)
  equal(created[1].seq, 7)
})
