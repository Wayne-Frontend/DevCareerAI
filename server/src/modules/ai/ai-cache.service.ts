import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { createHash } from 'crypto'
import { PrismaService } from '../../prisma/prisma.service'

interface CacheLookupInput {
  feature: string
  model: string
  payload: unknown
  version?: string
}

export interface AiCacheHit<T> {
  result: T
  rawText?: string | null
}

@Injectable()
export class AiCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T>(input: CacheLookupInput): Promise<AiCacheHit<T> | null> {
    const cacheKey = this.getCacheKey(input)
    const row = await this.prisma.aiCache.findUnique({ where: { cacheKey } })

    if (!row) return null
    const expiresAt = await this.getExpiresAt(cacheKey)
    if (expiresAt && expiresAt.getTime() <= Date.now()) return null

    return {
      result: row.resultJson as T,
      rawText: row.rawText,
    }
  }

  async set<T>(input: CacheLookupInput & { result: T; rawText?: string }) {
    const promptHash = this.getPromptHash(input.payload)
    const cacheKey = this.getCacheKey(input)

    await this.prisma.aiCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        feature: input.feature,
        model: input.model,
        promptHash,
        rawText: input.rawText,
        resultJson: input.result as Prisma.InputJsonValue,
      },
      update: {
        rawText: input.rawText,
        resultJson: input.result as Prisma.InputJsonValue,
      },
    })

    await this.setMetadata(cacheKey, input.version || 'v1', getNextExpiresAt())
  }

  getCacheKey(input: CacheLookupInput) {
    return `${input.feature}:${input.model}:${input.version || 'v1'}:${this.getPromptHash(input.payload)}`
  }

  private getPromptHash(payload: unknown) {
    return createHash('sha256').update(stableStringify(payload)).digest('hex')
  }

  private async getExpiresAt(cacheKey: string) {
    const rows = await this.prisma.$queryRaw<Array<{ expiresAt: Date | string | null }>>`
      SELECT "expiresAt" FROM "AiCache" WHERE "cacheKey" = ${cacheKey} LIMIT 1
    `
    const value = rows[0]?.expiresAt

    return value ? new Date(value) : null
  }

  private async setMetadata(cacheKey: string, version: string, expiresAt: Date) {
    await this.prisma.$executeRaw`
      UPDATE "AiCache"
      SET "version" = ${version}, "expiresAt" = ${expiresAt}
      WHERE "cacheKey" = ${cacheKey}
    `
  }
}

function getNextExpiresAt() {
  const ttlMs = 7 * 24 * 60 * 60 * 1000
  return new Date(Date.now() + ttlMs)
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
