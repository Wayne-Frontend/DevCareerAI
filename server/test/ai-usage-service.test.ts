import { deepEqual, doesNotReject, equal } from 'node:assert/strict'
import { test } from 'vitest'
import { AiUsageService } from '../src/modules/ai/ai-usage.service'
import type { PrismaService } from '../src/prisma/prisma.service'

function createRecordService(options: { failCreate?: boolean } = {}) {
  const created: Array<Record<string, unknown>> = []
  const prisma = {
    aiUsageLog: {
      create: async (args: { data: Record<string, unknown> }) => {
        if (options.failCreate) throw new Error('insert failed')
        created.push(args.data)
        return args.data
      },
    },
  } as unknown as PrismaService

  return { service: new AiUsageService(prisma), created }
}

/** getSummary 需要 aggregate/groupBy/findMany 全套 stub，这里集中组装。 */
function createSummaryService(data: {
  logRows?: Array<{ createdAt: Date; totalTokens: number }>
  userRows?: Array<{ userId: string | null; count: number; tokens: number }>
  users?: Array<{ id: string; username: string }>
}) {
  const prisma = {
    aiUsageLog: {
      aggregate: async () => ({
        _count: { _all: data.logRows?.length ?? 0 },
        _sum: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      }),
      groupBy: async (args: { by: string[] }) => {
        if (args.by[0] === 'userId') {
          return (data.userRows ?? []).map((row) => ({
            userId: row.userId,
            _count: { _all: row.count },
            _sum: { totalTokens: row.tokens },
          }))
        }
        return []
      },
      findMany: async () => data.logRows ?? [],
    },
    user: { findMany: async () => data.users ?? [] },
  } as unknown as PrismaService

  return new AiUsageService(prisma)
}

test('record：usage 缺 total_tokens 时用 prompt+completion 补齐', async () => {
  const { service, created } = createRecordService()

  await service.record({
    model: 'm1',
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  })

  equal(created[0].totalTokens, 15)
  equal(created[0].feature, 'unknown')
  equal(created[0].usageSource, 'reported')
})

test('record：负数与非法 token 值被归零', async () => {
  const { service, created } = createRecordService()

  await service.record({
    model: 'm1',
    usage: { prompt_tokens: -3, completion_tokens: Number.NaN, total_tokens: -1 },
  })

  equal(created[0].promptTokens, 0)
  equal(created[0].completionTokens, 0)
  equal(created[0].totalTokens, 0)
})

test('record：写库失败被吞掉，不影响主流程', async () => {
  const { service } = createRecordService({ failCreate: true })

  await doesNotReject(() => service.record({ model: 'm1' }))
})

test('getSummary：days 非法时回退默认 30，超上限截到 365', async () => {
  const service = createSummaryService({})

  equal((await service.getSummary(0)).range.days, 30)
  equal((await service.getSummary(Number.NaN)).range.days, 30)
  equal((await service.getSummary(9999)).range.days, 365)
})

test('getSummary：日序列按 UTC 日期分桶并升序输出', async () => {
  const service = createSummaryService({
    logRows: [
      { createdAt: new Date('2026-07-03T10:00:00Z'), totalTokens: 5 },
      { createdAt: new Date('2026-07-01T23:59:00Z'), totalTokens: 3 },
      { createdAt: new Date('2026-07-03T01:00:00Z'), totalTokens: 7 },
    ],
  })

  const summary = await service.getSummary()

  deepEqual(summary.daily, [
    { date: '2026-07-01', calls: 1, totalTokens: 3 },
    { date: '2026-07-03', calls: 2, totalTokens: 12 },
  ])
})

test('getSummary：byUser 补齐用户名，空 userId 归入匿名，查无用户回退短 id', async () => {
  const service = createSummaryService({
    userRows: [
      { userId: 'user-alice-id', count: 3, tokens: 100 },
      { userId: null, count: 2, tokens: 50 },
      { userId: 'deleted-user-id', count: 1, tokens: 10 },
    ],
    users: [{ id: 'user-alice-id', username: 'alice' }],
  })

  const summary = await service.getSummary()

  deepEqual(
    summary.byUser.map((item) => item.username),
    ['alice', '匿名', '已注销用户(delete)'],
  )
})
