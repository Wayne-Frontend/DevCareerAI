import { deepEqual, equal, notEqual, ok } from 'node:assert/strict'
import { test } from 'vitest'
import { AiCacheService, type AiGeneration } from '../src/modules/ai/ai-cache.service'
import type { PrismaService } from '../src/prisma/prisma.service'

function createService(aiCache: unknown) {
  return new AiCacheService({ aiCache } as unknown as PrismaService)
}

test('getCacheKey 与对象键顺序无关', () => {
  const service = createService({})
  const a = service.getCacheKey({
    feature: 'f',
    model: 'm',
    version: 'v1',
    userId: 'u1',
    payload: { a: 1, b: 2 },
  })
  const b = service.getCacheKey({
    feature: 'f',
    model: 'm',
    version: 'v1',
    userId: 'u1',
    payload: { b: 2, a: 1 },
  })
  equal(a, b)
})

test('getCacheKey 载荷不同则键不同', () => {
  const service = createService({})
  const a = service.getCacheKey({ feature: 'f', model: 'm', userId: 'u1', payload: { a: 1 } })
  const b = service.getCacheKey({ feature: 'f', model: 'm', userId: 'u1', payload: { a: 2 } })
  notEqual(a, b)
})

test('getCacheKey 按用户隔离：相同载荷不同用户键不同', () => {
  const service = createService({})
  const a = service.getCacheKey({ feature: 'f', model: 'm', userId: 'u1', payload: { a: 1 } })
  const b = service.getCacheKey({ feature: 'f', model: 'm', userId: 'u2', payload: { a: 1 } })
  notEqual(a, b)
})

test('set 使用调用方指定的 ttlMs 计算过期时间', async () => {
  let captured: { create: { expiresAt: Date } } | null = null
  const service = createService({
    upsert: async (args: { create: { expiresAt: Date } }) => {
      captured = args
    },
  })

  const before = Date.now()
  await service.set({
    feature: 'f',
    model: 'm',
    userId: 'u1',
    payload: {},
    ttlMs: 60 * 60 * 1000,
    result: { ok: true },
  })

  ok(captured, 'upsert 未被调用')
  const expiresAt = (captured as { create: { expiresAt: Date } }).create.expiresAt.getTime()
  ok(expiresAt >= before + 55 * 60 * 1000, 'TTL 过短')
  ok(expiresAt <= before + 65 * 60 * 1000, 'TTL 过长（未使用调用方 ttlMs）')
})

test('set 未指定 ttlMs 时默认 7 天', async () => {
  let captured: { create: { expiresAt: Date } } | null = null
  const service = createService({
    upsert: async (args: { create: { expiresAt: Date } }) => {
      captured = args
    },
  })

  const before = Date.now()
  await service.set({ feature: 'f', model: 'm', userId: 'u1', payload: {}, result: {} })

  const expiresAt = (
    captured as unknown as { create: { expiresAt: Date } }
  ).create.expiresAt.getTime()
  ok(expiresAt >= before + 6.9 * 24 * 60 * 60 * 1000)
  ok(expiresAt <= before + 7.1 * 24 * 60 * 60 * 1000)
})

test('resolve 未命中则生成并写入缓存', async () => {
  const upserts: unknown[] = []
  const service = createService({
    findUnique: async () => null,
    upsert: async (args: unknown) => {
      upserts.push(args)
    },
  })

  let generated = 0
  const res = await service.resolve(
    { feature: 'f', model: 'm', version: 'v1', userId: 'u1', payload: { a: 1 } },
    async () => {
      generated += 1
      return { result: { ok: true }, rawText: '{"ok":true}', status: 'success' as const }
    },
  )

  equal(generated, 1)
  equal(res.cached, false)
  deepEqual(res.result, { ok: true })
  equal(upserts.length, 1)
})

test('resolve 命中缓存则不再生成', async () => {
  const service = createService({
    findUnique: async () => ({ resultJson: { ok: true }, rawText: null, expiresAt: null }),
    upsert: async () => {
      throw new Error('命中缓存时不应写入')
    },
  })

  let generated = 0
  const res = await service.resolve(
    { feature: 'f', model: 'm', userId: 'u1', payload: {} },
    async () => {
      generated += 1
      return { result: { ok: false }, rawText: '', status: 'success' as const }
    },
  )

  equal(generated, 0)
  equal(res.cached, true)
  deepEqual(res.result, { ok: true })
})

test('resolve 解析失败(parse_error)不写缓存', async () => {
  let wrote = false
  const service = createService({
    findUnique: async () => null,
    upsert: async () => {
      wrote = true
    },
  })

  const res = await service.resolve(
    { feature: 'f', model: 'm', userId: 'u1', payload: {} },
    async () => ({
      result: { fallback: true },
      rawText: 'not-json',
      status: 'parse_error' as const,
    }),
  )

  equal(wrote, false)
  equal(res.cached, false)
  equal(res.status, 'parse_error')
})

test('resolve 首次 parse_error 时自动重试一次，重试成功则写缓存', async () => {
  let wrote = false
  const attempts: boolean[] = []
  const service = createService({
    findUnique: async () => null,
    upsert: async () => {
      wrote = true
    },
  })

  const res = await service.resolve<Record<string, boolean>>(
    { feature: 'f', model: 'm', userId: 'u1', payload: {} },
    async (attempt): Promise<AiGeneration<Record<string, boolean>>> => {
      attempts.push(attempt.retry)
      if (!attempt.retry) {
        return { result: { fallback: true }, rawText: 'broken', status: 'parse_error' }
      }
      return { result: { ok: true }, rawText: '{"ok":true}', status: 'success' }
    },
  )

  deepEqual(attempts, [false, true])
  equal(res.status, 'success')
  equal(res.retried, true)
  deepEqual(res.result, { ok: true })
  equal(wrote, true)
})

test('resolve 重试后仍失败则降级返回且只重试一次', async () => {
  let calls = 0
  const service = createService({
    findUnique: async () => null,
    upsert: async () => {
      throw new Error('失败结果不应写缓存')
    },
  })

  const res = await service.resolve(
    { feature: 'f', model: 'm', userId: 'u1', payload: {} },
    async () => {
      calls += 1
      return { result: { fallback: true }, rawText: 'still broken', status: 'parse_error' as const }
    },
  )

  equal(calls, 2)
  equal(res.status, 'parse_error')
  equal(res.retried, true)
})

test('resolve 首次成功则不重试，retried=false', async () => {
  let calls = 0
  const service = createService({
    findUnique: async () => null,
    upsert: async () => undefined,
  })

  const res = await service.resolve(
    { feature: 'f', model: 'm', userId: 'u1', payload: {} },
    async () => {
      calls += 1
      return { result: { ok: true }, rawText: '{}', status: 'success' as const }
    },
  )

  equal(calls, 1)
  equal(res.retried, false)
})
