import { ok } from 'node:assert/strict'
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

test('缺少必填字段：400 并列出校验错误', async () => {
  const response = await api()
    .post('/api/auth/register')
    .send({ username: 'alice', email: 'alice@example.com' })
    .expect(400)

  const messages: string[] = Array.isArray(response.body.message)
    ? response.body.message
    : [String(response.body.message)]
  ok(messages.some((item) => item.toLowerCase().includes('password')))
})

test('DTO 未声明的字段：forbidNonWhitelisted 直接 400，暴露契约漂移', async () => {
  await api()
    .post('/api/auth/register')
    .send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'password123',
      role: 'admin', // 试图注入未声明字段提权
    })
    .expect(400)
})

test('字段类型/格式非法：400（邮箱格式、密码强度）', async () => {
  await api()
    .post('/api/auth/register')
    .send({ username: 'alice', email: 'not-an-email', password: 'password123' })
    .expect(400)

  await api()
    .post('/api/auth/register')
    .send({ username: 'alice', email: 'alice@example.com', password: 'onlyletters' })
    .expect(400)
})
