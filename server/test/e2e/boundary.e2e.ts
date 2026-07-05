import { equal } from 'node:assert/strict'
import { afterAll, beforeAll, test } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import supertest from 'supertest'
import { createE2eApp, registerUser, truncateAll } from './create-app'
import type { PrismaService } from '../../src/prisma/prisma.service'

let app: INestApplication
let prisma: PrismaService
let tokenA = ''
let tokenB = ''
let sessionIdOfA = ''

beforeAll(async () => {
  ;({ app, prisma } = await createE2eApp())
  await truncateAll(prisma)

  const userA = await registerUser(app, { username: 'alice', email: 'alice@example.com' })
  const userB = await registerUser(app, { username: 'bob', email: 'bob@example.com' })
  tokenA = userA.accessToken
  tokenB = userB.accessToken

  const created = await supertest(app.getHttpServer())
    .post('/api/chat/sessions')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({})
    .expect(201)
  sessionIdOfA = created.body.id
})

afterAll(async () => {
  await app.close()
})

function api() {
  return supertest(app.getHttpServer())
}

// 项目红线：所有涉及用户数据的查询必须带当前用户边界，禁止跨用户读取

test('用户 B 读取用户 A 的会话：404（不暴露资源存在性）', async () => {
  await api()
    .get(`/api/chat/sessions/${sessionIdOfA}`)
    .set('Authorization', `Bearer ${tokenB}`)
    .expect(404)
})

test('用户 B 删除用户 A 的会话：404，且 A 的会话完好', async () => {
  await api()
    .delete(`/api/chat/sessions/${sessionIdOfA}`)
    .set('Authorization', `Bearer ${tokenB}`)
    .expect(404)

  await api()
    .get(`/api/chat/sessions/${sessionIdOfA}`)
    .set('Authorization', `Bearer ${tokenA}`)
    .expect(200)
})

test('会话列表按用户隔离', async () => {
  const listOfB = await api()
    .get('/api/chat/sessions')
    .set('Authorization', `Bearer ${tokenB}`)
    .expect(200)

  equal(listOfB.body.length, 0)

  const listOfA = await api()
    .get('/api/chat/sessions')
    .set('Authorization', `Bearer ${tokenA}`)
    .expect(200)

  equal(listOfA.body.length, 1)
})
