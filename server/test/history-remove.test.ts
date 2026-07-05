import { equal, deepEqual } from 'node:assert/strict'
import { test } from 'vitest'
import { HistoryService } from '../src/modules/history/history.service'
import type { PrismaService } from '../src/prisma/prisma.service'

interface DeleteCall {
  table: string
  where: Record<string, unknown>
}

function createService(hitTable: string | null) {
  const calls: DeleteCall[] = []
  const tables = ['resumeAnalysis', 'projectOptimization', 'jobMatchAnalysis', 'interviewSession']
  const tx: Record<string, unknown> = {}

  for (const table of tables) {
    tx[table] = {
      deleteMany: async (args: { where: Record<string, unknown> }) => {
        calls.push({ table, where: args.where })
        return { count: table === hitTable ? 1 : 0 }
      },
    }
  }

  const prisma = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService

  return { service: new HistoryService(prisma), calls }
}

test('remove：命中第一类记录后立即返回，不再尝试其余表', async () => {
  const { service, calls } = createService('resumeAnalysis')

  const result = await service.remove('r1', 'u1')

  equal(result.success, true)
  deepEqual(
    calls.map((call) => call.table),
    ['resumeAnalysis'],
  )
})

test('remove：命中最后一类记录时前三类均已尝试', async () => {
  const { service, calls } = createService('interviewSession')

  const result = await service.remove('i1', 'u1')

  equal(result.success, true)
  equal(calls.length, 4)
})

test('remove：四类都未命中时如实返回 success=false', async () => {
  const { service } = createService(null)

  const result = await service.remove('missing', 'u1')

  equal(result.success, false)
})

test('remove：job-match 归属校验只依赖简历侧，JD 归属异常不阻断删除', async () => {
  const { service, calls } = createService('jobMatchAnalysis')

  await service.remove('j1', 'u1')

  const jobCall = calls.find((call) => call.table === 'jobMatchAnalysis')
  deepEqual(jobCall?.where, { id: 'j1', resume: { userId: 'u1' } })
})
