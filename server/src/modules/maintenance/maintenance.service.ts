import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'

// auto 简历/JD 创建后至少保留这么久才允许清理，避免误删"刚创建、关联记录还没写入"的进行中请求。
const AUTO_ENTITY_MIN_AGE_MS = 24 * 60 * 60 * 1000

/**
 * 定期清理过期数据，避免 AiCache、AuthSession、孤儿 auto 简历/JD 无限增长。
 * 启动时跑一次，之后每天凌晨 3 点执行。
 */
@Injectable()
export class MaintenanceService implements OnModuleInit {
  private readonly logger = new Logger(MaintenanceService.name)

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // 清理属后台维护任务，失败（如迁移未执行、库文件异常）只记日志，不阻断服务启动；
    // 真正的数据库问题会由首个业务请求以更明确的方式暴露。
    try {
      await this.cleanupExpired()
    } catch (error) {
      this.logger.error(
        '启动清理任务失败，跳过本次清理',
        error instanceof Error ? error.stack : String(error),
      )
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpired() {
    const now = new Date()
    const autoCreatedBefore = new Date(now.getTime() - AUTO_ENTITY_MIN_AGE_MS)
    const [cache, sessions, autoResumes, autoJobs] = await Promise.all([
      this.prisma.aiCache.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.authSession.deleteMany({ where: { expiresAt: { lt: now } } }),
      // auto 简历/JD 由匹配/面试流程临时创建。被历史引用的仍是历史数据的载体
      // （JobMatchAnalysis 对二者是级联删除，删了会连带清掉用户的匹配历史），
      // 故只清理已无任何引用的孤儿：AI 中途失败的残留、或历史记录被删后的遗留。
      this.prisma.resume.deleteMany({
        where: {
          source: 'auto',
          createdAt: { lt: autoCreatedBefore },
          analyses: { none: {} },
          jobMatches: { none: {} },
          interviews: { none: {} },
          chatSessions: { none: {} },
        },
      }),
      this.prisma.jobDescription.deleteMany({
        where: {
          source: 'auto',
          createdAt: { lt: autoCreatedBefore },
          matches: { none: {} },
          interviews: { none: {} },
          chatSessions: { none: {} },
        },
      }),
    ])

    const total = cache.count + sessions.count + autoResumes.count + autoJobs.count
    if (total > 0) {
      this.logger.log(
        `已清理过期数据：AiCache ${cache.count} 行，AuthSession ${sessions.count} 行，孤儿 auto 简历 ${autoResumes.count} 行，孤儿 auto JD ${autoJobs.count} 行`,
      )
    }
  }
}
