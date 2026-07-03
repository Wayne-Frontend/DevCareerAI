import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
    // WAL 允许读写并发，避免 AI 长请求写库期间阻塞其他用户（属性持久化在 db 文件上，设一次即生效）。
    // PRAGMA 会返回结果行，SQLite 下必须走 $queryRawUnsafe（$executeRawUnsafe 会报 "Execute returned results"）。
    await this.$queryRawUnsafe('PRAGMA journal_mode=WAL;')
    // 偶发写冲突时最多等待 5s 重试，而不是立刻抛 "database is locked"。
    await this.$queryRawUnsafe('PRAGMA busy_timeout=5000;')
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
