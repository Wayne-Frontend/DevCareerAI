import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { AiUsage } from './ai.types'
import type {
  AiUsageBreakdownItem,
  AiUsageDailyItem,
  AiUsageSummary,
  AiUsageUserItem,
} from './ai-usage.types'

interface RecordInput {
  feature?: string
  userId?: string | null
  model: string
  usage?: AiUsage
}

const DEFAULT_SUMMARY_DAYS = 30
const MAX_SUMMARY_DAYS = 365
// 用户消耗排行只展示头部，避免用户量大时把整表拉进内存 / 传给前端。
const TOP_USERS_LIMIT = 10

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录一次真实的 AI 调用用量。埋点绝不能拖垮主流程：任何写库异常都吞掉并记警告。
   * 仅在缓存未命中、实际发生调用时被触发，因此命中缓存的请求自然不计入 token。
   */
  async record(input: RecordInput): Promise<void> {
    try {
      const prompt = toInt(input.usage?.prompt_tokens)
      const completion = toInt(input.usage?.completion_tokens)
      const total = toInt(input.usage?.total_tokens) || prompt + completion

      await this.prisma.aiUsageLog.create({
        data: {
          feature: input.feature ?? 'unknown',
          model: input.model,
          userId: input.userId ?? undefined,
          promptTokens: prompt,
          completionTokens: completion,
          totalTokens: total,
        },
      })
    } catch (error) {
      this.logger.warn(
        `记录 AI 用量失败：${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async getSummary(days = DEFAULT_SUMMARY_DAYS): Promise<AiUsageSummary> {
    const safeDays = clampDays(days)
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000)
    const where = { createdAt: { gte: since } }

    const [totals, featureRows, modelRows, userRows, daily] = await Promise.all([
      this.prisma.aiUsageLog.aggregate({
        where,
        _count: { _all: true },
        _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['feature'],
        where,
        _count: { _all: true },
        _sum: { totalTokens: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['model'],
        where,
        _count: { _all: true },
        _sum: { totalTokens: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['userId'],
        where,
        _count: { _all: true },
        _sum: { totalTokens: true },
        orderBy: { _sum: { totalTokens: 'desc' } },
        take: TOP_USERS_LIMIT,
      }),
      this.getDailySeries(since),
    ])

    return {
      range: { since: since.toISOString(), days: safeDays },
      totals: {
        calls: totals._count._all,
        promptTokens: totals._sum.promptTokens ?? 0,
        completionTokens: totals._sum.completionTokens ?? 0,
        totalTokens: totals._sum.totalTokens ?? 0,
      },
      byFeature: toBreakdown(
        featureRows.map((row) => ({
          key: row.feature,
          count: row._count._all,
          tokens: row._sum.totalTokens,
        })),
      ),
      byModel: toBreakdown(
        modelRows.map((row) => ({
          key: row.model,
          count: row._count._all,
          tokens: row._sum.totalTokens,
        })),
      ),
      byUser: await this.resolveUserBreakdown(
        userRows.map((row) => ({
          userId: row.userId ?? null,
          calls: row._count._all,
          totalTokens: row._sum.totalTokens ?? 0,
        })),
      ),
      daily,
    }
  }

  /**
   * 把按 userId 聚合的行补上用户名。userId 为空的是未登录调用，统一归入“匿名”桶；
   * 已删除用户（id 查不到）回退为短 id 兜底，避免展示空白。groupBy 已按 token 降序，
   * 这里只做映射不再排序。
   */
  private async resolveUserBreakdown(
    rows: Array<{ userId: string | null; calls: number; totalTokens: number }>,
  ): Promise<AiUsageUserItem[]> {
    const ids = rows.map((row) => row.userId).filter((id): id is string => id !== null)
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, username: true },
        })
      : []
    const nameById = new Map(users.map((user) => [user.id, user.username]))

    return rows.map((row) => ({
      userId: row.userId,
      username:
        row.userId === null
          ? '匿名'
          : (nameById.get(row.userId) ?? `已注销用户(${row.userId.slice(0, 6)})`),
      calls: row.calls,
      totalTokens: row.totalTokens,
    }))
  }

  /**
   * 日粒度序列。Prisma groupBy 不支持按日期截断，而 SQLite 的日期存储格式随版本有别
   * （文本 / epoch），直接写 strftime 原生 SQL 不稳。这里取回区间内的行，在 JS 里按 UTC
   * 日期分桶，与底层存储格式解耦。
   */
  private async getDailySeries(since: Date): Promise<AiUsageDailyItem[]> {
    const rows = await this.prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, totalTokens: true },
    })

    const buckets = new Map<string, { calls: number; totalTokens: number }>()
    for (const row of rows) {
      const date = row.createdAt.toISOString().slice(0, 10)
      const bucket = buckets.get(date) ?? { calls: 0, totalTokens: 0 }
      bucket.calls += 1
      bucket.totalTokens += row.totalTokens
      buckets.set(date, bucket)
    }

    return [...buckets.entries()]
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }
}

function toInt(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value as number)) : 0
}

function clampDays(days: number): number {
  if (!Number.isFinite(days) || days <= 0) return DEFAULT_SUMMARY_DAYS
  return Math.min(MAX_SUMMARY_DAYS, Math.floor(days))
}

function toBreakdown(
  rows: Array<{ key: string; count: number; tokens: number | null }>,
): AiUsageBreakdownItem[] {
  return rows
    .map((row) => ({ key: row.key, calls: row.count, totalTokens: row.tokens ?? 0 }))
    .sort((a, b) => b.totalTokens - a.totalTokens)
}
