import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * 启动时把 ADMIN_EMAILS 名单里的已注册用户置为管理员（只升不降）。
 * 这是"第一个管理员从哪来"的唯一入口——不暴露任何提权 API。
 * 顺序上要求：用户先注册 → 邮箱进名单 → 重启服务生效。
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const emails = parseAdminEmails(this.configService.get<string>('ADMIN_EMAILS'))
    if (!emails.length) return

    const result = await this.prisma.user.updateMany({
      where: { email: { in: emails }, role: { not: 'admin' } },
      data: { role: 'admin' },
    })

    if (result.count > 0) {
      this.logger.log(`已根据 ADMIN_EMAILS 将 ${result.count} 个用户置为管理员`)
    }
  }
}

export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return []

  return [
    ...new Set(
      raw
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ]
}
