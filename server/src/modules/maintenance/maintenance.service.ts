import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * 定期清理过期数据，避免 AiCache、AuthSession 无限增长。
 * 启动时跑一次，之后每天凌晨 3 点执行。
 */
@Injectable()
export class MaintenanceService implements OnModuleInit {
  private readonly logger = new Logger(MaintenanceService.name)

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.cleanupExpired()
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpired() {
    const now = new Date()
    const [cache, sessions] = await Promise.all([
      this.prisma.aiCache.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.authSession.deleteMany({ where: { expiresAt: { lt: now } } }),
    ])

    if (cache.count || sessions.count) {
      this.logger.log(`已清理过期数据：AiCache ${cache.count} 行，AuthSession ${sessions.count} 行`)
    }
  }
}
