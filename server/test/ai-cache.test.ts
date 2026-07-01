import { deepEqual, equal, notEqual } from 'node:assert/strict'
import { test } from 'node:test'
import { AiCacheService } from '../src/modules/ai/ai-cache.service'
import type { PrismaService } from '../src/prisma/prisma.service'

function createService(aiCache: unknown) {
  return new AiCacheService({ aiCache } as unknown as PrismaService)
}

test('getCacheKey 与对象键顺序无关', () => {
  const service = createService({})
  const a = service.getCacheKey({ feature: 'f', model: 'm', version: 'v1', payload: { a: 1, b: 2 } })
  const b = service.getCacheKey({ feature: 'f', model: 'm', version: 'v1', payload: { b: 2, a: 1 } })
  equal(a, b)
})

test('getCacheKey 载荷不同则键不同', () => {
  const service = createService({})
  const a = service.getCacheKey({ feature: 'f', model: 'm', payload: { a: 1 } })
  const b = service.getCacheKey({ feature: 'f', model: 'm', payload: { a: 2 } })
  notEqual(a, b)
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
  const res = await service.resolve({ feature: 'f', model: 'm', version: 'v1', payload: { a: 1 } }, async () => {
    generated += 1
    return { result: { ok: true }, rawText: '{"ok":true}', status: 'success' as const }
  })

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
  const res = await service.resolve({ feature: 'f', model: 'm', payload: {} }, async () => {
    generated += 1
    return { result: { ok: false }, rawText: '', status: 'success' as const }
  })

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

  const res = await service.resolve({ feature: 'f', model: 'm', payload: {} }, async () => ({
    result: { fallback: true },
    rawText: 'not-json',
    status: 'parse_error' as const,
  }))

  equal(wrote, false)
  equal(res.cached, false)
  equal(res.status, 'parse_error')
})
