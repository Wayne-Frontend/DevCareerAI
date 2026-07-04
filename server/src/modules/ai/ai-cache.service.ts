import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { createHash } from 'crypto'
import type { AiGenerationAttempt } from '../../common/utils/ai-retry.util'
import { PrismaService } from '../../prisma/prisma.service'
import type { AiResultStatus } from './ai.types'

// 默认缓存 7 天（诊断/匹配/优化类结果）；对话点评类内容用更短的 TTL，由调用方显式传入。
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface CacheLookupInput {
  feature: string
  model: string
  // 缓存按用户隔离：AI 结果是个性化内容，即使 prompt 相同也不应跨用户共享。
  userId: string
  payload: unknown
  version?: string
  ttlMs?: number
}

export interface AiCacheHit<T> {
  result: T
  rawText?: string | null
}

export interface AiGeneration<T> {
  result: T
  rawText: string
  status: AiResultStatus
}

export interface AiResolveResult<T> {
  result: T
  cached: boolean
  status: AiResultStatus
  // 首次生成解析失败、已自动重试过一次（无论重试是否成功）。
  retried: boolean
}

@Injectable()
export class AiCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T>(input: CacheLookupInput): Promise<AiCacheHit<T> | null> {
    const cacheKey = this.getCacheKey(input)
    const row = await this.prisma.aiCache.findUnique({ where: { cacheKey } })

    if (!row) return null
    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null

    return {
      result: row.resultJson as T,
      rawText: row.rawText,
    }
  }

  async set<T>(input: CacheLookupInput & { result: T; rawText?: string }) {
    const promptHash = this.getPromptHash(input.payload)
    const cacheKey = this.getCacheKey(input)
    const version = input.version || 'v1'
    const expiresAt = getNextExpiresAt(input.ttlMs)

    await this.prisma.aiCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        feature: input.feature,
        model: input.model,
        version,
        promptHash,
        rawText: input.rawText,
        resultJson: input.result as Prisma.InputJsonValue,
        expiresAt,
      },
      update: {
        version,
        rawText: input.rawText,
        resultJson: input.result as Prisma.InputJsonValue,
        expiresAt,
      },
    })
  }

  /**
   * 统一的"查缓存 → 命中直接返回 / 未命中生成并写入"流程。
   * 非流式与流式调用共用同一份缓存。仅当生成结果为合法 JSON（status=success）时才写入，
   * 避免把解析失败的降级文本缓存下来。
   * 首次生成解析失败（parse_error）时自动重试一次（上限 1 次，防止成本失控）：
   * 调用方可通过 attempt.retry 调整重试载荷（见 applyStrictJsonRetry）。
   */
  async resolve<T>(
    input: CacheLookupInput,
    generate: (attempt: AiGenerationAttempt) => Promise<AiGeneration<T>>,
  ): Promise<AiResolveResult<T>> {
    const cached = await this.get<T>(input)
    if (cached) {
      return { result: cached.result, cached: true, status: 'success', retried: false }
    }

    let generated = await generate({ retry: false })
    let retried = false

    if (generated.status === 'parse_error') {
      retried = true
      generated = await generate({ retry: true })
    }

    if (generated.status === 'success') {
      await this.set({ ...input, result: generated.result, rawText: generated.rawText })
    }

    return { result: generated.result, cached: false, status: generated.status, retried }
  }

  getCacheKey(input: CacheLookupInput) {
    return `${input.feature}:${input.model}:${input.version || 'v1'}:${input.userId}:${this.getPromptHash(input.payload)}`
  }

  private getPromptHash(payload: unknown) {
    return createHash('sha256').update(stableStringify(payload)).digest('hex')
  }
}

function getNextExpiresAt(ttlMs?: number) {
  return new Date(Date.now() + (ttlMs && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS))
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const objectValue = value as Record<string, unknown>
  return `{${Object.keys(objectValue)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`)
    .join(',')}}`
}
