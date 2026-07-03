import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { AdminUserItem, AdminUserListResult } from '@devcareer/shared'
import { PrismaService } from '../../prisma/prisma.service'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

interface ListParams {
  page?: number
  pageSize?: number
  keyword?: string
}

@Injectable()
export class AdminUserService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListParams): Promise<AdminUserListResult> {
    const page = clampPositive(params.page, 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, clampPositive(params.pageSize, DEFAULT_PAGE_SIZE))
    const keyword = params.keyword?.trim()

    // SQLite 的 contains 默认区分大小写，账号均以小写存储，这里把关键词转小写再匹配。
    const where = keyword
      ? {
          OR: [
            { username: { contains: keyword.toLowerCase() } },
            { email: { contains: keyword.toLowerCase() } },
          ],
        }
      : {}

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
    ])

    const tokensByUser = await this.sumTokensByUser(users.map((user) => user.id))

    return {
      items: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        totalTokens: tokensByUser.get(user.id) ?? 0,
      })),
      total,
      page,
      pageSize,
    }
  }

  async updateRole(
    targetId: string,
    operatorId: string,
    role: 'user' | 'admin',
  ): Promise<AdminUserItem> {
    const target = await this.requireUser(targetId)

    if (target.id === operatorId) {
      throw new ForbiddenException('不能修改自己的角色，避免误操作导致失去管理员权限')
    }

    // 把最后一名管理员降级会让系统再无人可管理，禁止。
    if (target.role === 'admin' && role !== 'admin') {
      await this.assertNotLastAdmin(target.id)
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: userItemSelect,
    })

    return this.toItem(updated)
  }

  async updateStatus(
    targetId: string,
    operatorId: string,
    status: 'active' | 'disabled',
  ): Promise<AdminUserItem> {
    const target = await this.requireUser(targetId)

    if (target.id === operatorId) {
      throw new ForbiddenException('不能封禁自己')
    }

    // 封禁最后一名管理员同样会导致无人可管理，禁止。
    if (status === 'disabled' && target.role === 'admin') {
      await this.assertNotLastAdmin(target.id)
    }

    // 封禁时删除该用户全部会话，令其正在使用的 token 立即失效（即时踢下线）。
    const updated = await this.prisma.$transaction(async (tx) => {
      if (status === 'disabled') {
        await tx.authSession.deleteMany({ where: { userId: targetId } })
      }
      return tx.user.update({
        where: { id: targetId },
        data: { status },
        select: userItemSelect,
      })
    })

    return this.toItem(updated)
  }

  private async requireUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    })

    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    return user
  }

  private async assertNotLastAdmin(excludingId: string) {
    const otherAdmins = await this.prisma.user.count({
      where: { role: 'admin', status: 'active', id: { not: excludingId } },
    })

    if (otherAdmins === 0) {
      throw new ForbiddenException('系统至少需要保留一名启用状态的管理员')
    }
  }

  private async sumTokensByUser(userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map()

    const rows = await this.prisma.aiUsageLog.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: { totalTokens: true },
    })

    return new Map(
      rows
        .filter((row): row is typeof row & { userId: string } => row.userId !== null)
        .map((row) => [row.userId, row._sum.totalTokens ?? 0]),
    )
  }

  private toItem(user: {
    id: string
    username: string
    email: string
    role: string
    status: string
    createdAt: Date
  }): AdminUserItem {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      totalTokens: 0,
    }
  }
}

const userItemSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const

function clampPositive(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || (value as number) < 1) return fallback
  return Math.floor(value as number)
}
