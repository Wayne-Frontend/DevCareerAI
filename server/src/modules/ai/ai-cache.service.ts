import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { createHash } from 'crypto'
import { PrismaService } from '../../prisma/prisma.service'

interface CacheLookupInput {
  feature: string
  model: string
  payload: unknown
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
  }

  getCacheKey(input: CacheLookupInput) {
    return `${input.feature}:${input.model}:${this.getPromptHash(input.payload)}`
  }

  private getPromptHash(payload: unknown) {
    return createHash('sha256').update(stableStringify(payload)).digest('hex')
  }
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
