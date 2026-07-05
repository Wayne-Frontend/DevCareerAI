import { deepEqual, doesNotReject, equal, ok } from 'node:assert/strict'
import { test } from 'vitest'
import { MaintenanceService } from '../src/modules/maintenance/maintenance.service'
import { SUMMARIZING_STALE_MS } from '../src/modules/interview/interview.service'
import type { PrismaService } from '../src/prisma/prisma.service'

interface Captured {
  aiCacheWhere?: Record<string, unknown>
  authSessionWhere?: Record<string, unknown>
  resumeWhere?: Record<string, unknown>
  jobWhere?: Record<string, unknown>
  interviewArgs?: { where: Record<string, unknown>; data: Record<string, unknown> }
}

function createService() {
  const captured: Captured = {}
  const prisma = {
    aiCache: {
      deleteMany: async (args: { where: Record<string, unknown> }) => {
        captured.aiCacheWhere = args.where
        return { count: 0 }
      },
    },
    authSession: {
      deleteMany: async (args: { where: Record<string, unknown> }) => {
        captured.authSessionWhere = args.where
        return { count: 0 }
      },
    },
    resume: {
      deleteMany: async (args: { where: Record<string, unknown> }) => {
        captured.resumeWhere = args.where
        return { count: 0 }
      },
    },
    jobDescription: {
      deleteMany: async (args: { where: Record<string, unknown> }) => {
        captured.jobWhere = args.where
        return { count: 0 }
      },
    },
    interviewSession: {
      updateMany: async (args: {
        where: Record<string, unknown>
        data: Record<string, unknown>
      }) => {
        captured.interviewArgs = args
        return { count: 0 }
      },
    },
  } as unknown as PrismaService

  return { service: new MaintenanceService(prisma), captured }
}

test('cleanupExpired：AiCache/AuthSession 按 expiresAt < now 清理', async () => {
  const { service, captured } = createService()
  const before = Date.now()

  await service.cleanupExpired()

  const cacheLt = (captured.aiCacheWhere?.expiresAt as { lt: Date }).lt
  const sessionLt = (captured.authSessionWhere?.expiresAt as { lt: Date }).lt
  ok(cacheLt instanceof Date && cacheLt.getTime() >= before)
  ok(sessionLt instanceof Date)
})

test('cleanupExpired：auto 简历只清理超过 24 小时且无任何引用的孤儿', async () => {
  const { service, captured } = createService()
  const now = Date.now()

  await service.cleanupExpired()

  const where = captured.resumeWhere ?? {}
  equal(where.source, 'auto')
  // 创建时间门槛约等于 now - 24h（允许执行耗时带来的微小偏差）
  const threshold = (where.createdAt as { lt: Date }).lt.getTime()
  ok(Math.abs(threshold - (now - 24 * 60 * 60 * 1000)) < 5000)
  deepEqual(where.analyses, { none: {} })
  deepEqual(where.jobMatches, { none: {} })
  deepEqual(where.interviews, { none: {} })
  deepEqual(where.chatSessions, { none: {} })
})

test('cleanupExpired：auto JD 的孤儿判定覆盖匹配/面试/会话三类引用', async () => {
  const { service, captured } = createService()

  await service.cleanupExpired()

  const where = captured.jobWhere ?? {}
  equal(where.source, 'auto')
  deepEqual(where.matches, { none: {} })
  deepEqual(where.interviews, { none: {} })
  deepEqual(where.chatSessions, { none: {} })
})

test('cleanupExpired：超时的 summarizing 面试会话回滚为 ongoing', async () => {
  const { service, captured } = createService()
  const now = Date.now()

  await service.cleanupExpired()

  const args = captured.interviewArgs
  equal(args?.where.status, 'summarizing')
  deepEqual(args?.data, { status: 'ongoing' })
  const threshold = ((args?.where.updatedAt as { lt: Date }) ?? { lt: new Date(0) }).lt.getTime()
  ok(Math.abs(threshold - (now - SUMMARIZING_STALE_MS)) < 5000)
})

test('onModuleInit：清理失败只记日志，不阻断服务启动', async () => {
  // 五个操作全部失败，模拟数据库整体不可用；缺任何一个模型都会让先创建的
  // rejection 变成未处理拒绝，因此 stub 必须补全 cleanupExpired 触碰的所有表
  const fail = async () => {
    throw new Error('database is not ready')
  }
  const prisma = {
    aiCache: { deleteMany: fail },
    authSession: { deleteMany: fail },
    resume: { deleteMany: fail },
    jobDescription: { deleteMany: fail },
    interviewSession: { updateMany: fail },
  } as unknown as PrismaService
  const service = new MaintenanceService(prisma)

  await doesNotReject(() => service.onModuleInit())
})
