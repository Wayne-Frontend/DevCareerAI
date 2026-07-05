import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../src/app.module'
import { setupApp } from '../../src/app.setup'
import { PrismaService } from '../../src/prisma/prisma.service'
import { AI_PROVIDER, type AiProvider } from '../../src/modules/ai/providers/ai-provider.interface'
import type { ChatOptions, ChatStreamOptions } from '../../src/modules/ai/ai.types'

export const FAKE_AI_REPLY = 'AI 回复（e2e stub）'

/** 可按用例覆写部分方法的假 AI provider：默认返回固定文本，永不触网。 */
export function fakeAiProvider(overrides: Partial<AiProvider> = {}): AiProvider {
  return {
    getModel: () => 'e2e-fake-model',
    chat: async (_options: ChatOptions) => ({
      text: FAKE_AI_REPLY,
      model: 'e2e-fake-model',
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
    chatStream: async (options: ChatStreamOptions) => {
      options.onDelta?.(FAKE_AI_REPLY)
      return {
        text: FAKE_AI_REPLY,
        model: 'e2e-fake-model',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }
    },
    ...overrides,
  }
}

/**
 * 创建与生产同管道（setupApp）的 Nest 应用，AI provider 全局替换为离线 stub。
 * 用完必须 await app.close()：ScheduleModule 的定时器不关闭会挂住 vitest worker。
 */
export async function createE2eApp(overrides: Partial<AiProvider> = {}) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AI_PROVIDER)
    .useValue(fakeAiProvider(overrides))
    .compile()

  const app: INestApplication = moduleRef.createNestApplication()
  setupApp(app)
  await app.init()

  const prisma = app.get(PrismaService)
  return { app, prisma }
}

/** 清空 public schema 下除迁移记录外的全部表（表名从 pg_tables 动态取，schema 演进免维护）。 */
export async function truncateAll(prisma: PrismaService) {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (rows.length === 0) return
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${rows.map((row) => `"${row.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
  )
}

/** 注册一个用户并返回 accessToken 与 refresh cookie（供跨用户边界等用例复用）。 */
export async function registerUser(
  app: INestApplication,
  user: { username: string; email: string; password?: string },
) {
  const supertest = await import('supertest')
  const response = await supertest
    .default(app.getHttpServer())
    .post('/api/auth/register')
    .send({ username: user.username, email: user.email, password: user.password ?? 'password123' })
    .expect(201)

  return {
    accessToken: response.body.accessToken as string,
    user: response.body.user as { id: string; username: string; role: string },
    cookies: readSetCookies(response.headers['set-cookie']),
  }
}

/** 归一化 set-cookie 头为字符串数组。 */
export function readSetCookies(header: string | string[] | undefined): string[] {
  if (!header) return []
  return Array.isArray(header) ? header : [header]
}
