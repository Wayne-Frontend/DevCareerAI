import { equal, ok } from 'node:assert/strict'
import { afterAll, beforeAll, test } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import supertest from 'supertest'
import { FAKE_AI_REPLY, createE2eApp, registerUser, truncateAll } from './create-app'
import type { PrismaService } from '../../src/prisma/prisma.service'

let app: INestApplication
let prisma: PrismaService
let token = ''

beforeAll(async () => {
  ;({ app, prisma } = await createE2eApp())
  await truncateAll(prisma)
  const user = await registerUser(app, { username: 'alice', email: 'alice@example.com' })
  token = user.accessToken
})

afterAll(async () => {
  await app.close()
})

function api() {
  return supertest(app.getHttpServer())
}

test('发送首条消息：AI 走离线 stub，user/ai 两条消息落库，标题取内容前 20 字符', async () => {
  const created = await api()
    .post('/api/chat/sessions')
    .set('Authorization', `Bearer ${token}`)
    .send({})
    .expect(201)
  const sessionId = created.body.id as string
  const content = '这是一条明显超过二十个字符长度限制的用户提问内容'

  const response = await api()
    .post(`/api/chat/sessions/${sessionId}/messages`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content })
    .expect(201)

  equal(response.body.title, `${content.slice(0, 20)}…`)
  equal(response.body.userMessage.content, content)
  equal(response.body.aiMessage.content, FAKE_AI_REPLY)

  // 数据库侧确认：两条消息真实落库且归属该会话
  const messages = await prisma.chatMessage.findMany({ where: { sessionId } })
  equal(messages.length, 2)
  ok(messages.some((message) => message.role === 'user'))
  ok(messages.some((message) => message.role === 'ai'))
})

test('创建会话引用不存在/非本人的简历：404', async () => {
  await api()
    .post('/api/chat/sessions')
    .set('Authorization', `Bearer ${token}`)
    .send({ resumeId: 'c0000000000000000000000000' })
    .expect(404)
})
