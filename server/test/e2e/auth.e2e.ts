import { equal, match, notEqual, ok } from 'node:assert/strict'
import { afterAll, beforeAll, test } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import supertest from 'supertest'
import { createE2eApp, readSetCookies, truncateAll } from './create-app'
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

function refreshCookieOf(cookies: string[]) {
  return cookies.find((cookie) => cookie.startsWith('devcareer_refresh_token='))
}

test('空库首个注册用户自动成为管理员，refresh token 走 HttpOnly Cookie 下发', async () => {
  const response = await api()
    .post('/api/auth/register')
    .send({ username: 'alice', email: 'alice@example.com', password: 'password123' })
    .expect(201)

  equal(response.body.user.role, 'admin')
  ok(response.body.accessToken)

  const cookie = refreshCookieOf(readSetCookies(response.headers['set-cookie']))
  ok(cookie, '应下发 refresh cookie')
  match(cookie, /HttpOnly/i)
  match(cookie, /Path=\/api\/auth/i)
  // refresh token 绝不出现在响应体里
  equal(response.body.refreshToken, undefined)
})

test('后续注册用户为普通角色', async () => {
  const response = await api()
    .post('/api/auth/register')
    .send({ username: 'bob', email: 'bob@example.com', password: 'password123' })
    .expect(201)

  equal(response.body.user.role, 'user')
})

test('携带 accessToken 访问 /auth/me 返回本人信息', async () => {
  const login = await api()
    .post('/api/auth/login')
    .send({ account: 'alice', password: 'password123' })
    .expect(201)

  const me = await api()
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .expect(200)

  equal(me.body.username, 'alice')
})

test('refresh 轮换：旧 cookie 复用被拒并吊销整个会话', async () => {
  const login = await api()
    .post('/api/auth/login')
    .send({ account: 'bob', password: 'password123' })
    .expect(201)
  const originalCookie = refreshCookieOf(readSetCookies(login.headers['set-cookie']))!

  // 第一次 refresh：拿到新 accessToken，cookie 轮换为新值
  const refreshed = await api().post('/api/auth/refresh').set('Cookie', originalCookie).expect(201)
  const rotatedCookie = refreshCookieOf(readSetCookies(refreshed.headers['set-cookie']))!
  ok(refreshed.body.accessToken)
  notEqual(rotatedCookie, originalCookie)

  // 复用已被轮换的旧 cookie：判定为泄露，拒绝并吊销会话
  await api().post('/api/auth/refresh').set('Cookie', originalCookie).expect(401)

  // 会话已吊销，轮换出的新 cookie 也一并失效
  await api().post('/api/auth/refresh').set('Cookie', rotatedCookie).expect(401)
})

test('logout 清除 refresh cookie', async () => {
  const login = await api()
    .post('/api/auth/login')
    .send({ account: 'alice', password: 'password123' })
    .expect(201)
  const cookie = refreshCookieOf(readSetCookies(login.headers['set-cookie']))!

  const logout = await api().post('/api/auth/logout').set('Cookie', cookie).expect(201)

  const cleared = refreshCookieOf(readSetCookies(logout.headers['set-cookie']))
  ok(cleared, 'logout 应下发清除 cookie 的 Set-Cookie')
  match(cleared, /Expires=Thu, 01 Jan 1970|Max-Age=0/i)

  // 注销后的 cookie 不能再换取新 token
  await api().post('/api/auth/refresh').set('Cookie', cookie).expect(401)
})
