import { equal, ok } from 'node:assert/strict'
import { afterAll, beforeAll, test } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import supertest from 'supertest'
import { createE2eApp, truncateAll } from './create-app'
import type { PrismaService } from '../../src/prisma/prisma.service'

let app: INestApplication
let prisma: PrismaService

beforeAll(async () => {
  ;({ app, prisma } = await createE2eApp())
  await truncateAll(prisma)
})

afterAll(async () => {
  await app.close()
})

function api() {
  return supertest(app.getHttpServer())
}

test('未携带 token 访问受保护路由被全局守卫拦下 401', async () => {
  await api().get('/api/dashboard/overview').expect(401)
  await api().get('/api/chat/sessions').expect(401)
})

test('伪造/损坏的 token 一律 401', async () => {
  await api()
    .get('/api/dashboard/overview')
    .set('Authorization', 'Bearer not-a-real-jwt')
    .expect(401)
})

test('@Public 路由无 token 可达（到达业务校验层而非被守卫拦截）', async () => {
  // 缺少字段 → 400 来自 ValidationPipe，证明请求穿过了 AuthGuard
  const response = await api().post('/api/auth/login').send({}).expect(400)
  ok(Array.isArray(response.body.message) || typeof response.body.message === 'string')
})

test('登录接口按 IP 限流：一分钟内超过 5 次即 429', async () => {
  const payload = { account: 'nobody', password: 'wrongpass1' }
  // 同文件的其他用例也可能消耗过 /auth/login 的限流配额（守卫在校验层之前计数），
  // 故不锁死具体次数：最多发 6 次，必须先出现凭据错误 401、随后出现 429
  const statuses: number[] = []

  for (let attempt = 1; attempt <= 6 && !statuses.includes(429); attempt += 1) {
    const response = await api().post('/api/auth/login').send(payload)
    statuses.push(response.status)
  }

  ok(statuses.includes(401), `限流前应有凭据错误 401，实际序列：${statuses.join(',')}`)
  equal(statuses[statuses.length - 1], 429, `应以 429 结束，实际序列：${statuses.join(',')}`)
})
