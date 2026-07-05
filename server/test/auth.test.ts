import { equal, notEqual } from 'node:assert/strict'
import { test } from 'vitest'
import {
  extractBearerToken,
  extractCookieValue,
  hashPassword,
  verifyPassword,
} from '../src/modules/auth/auth.service'

test('密码哈希可被正确校验', async () => {
  const hash = await hashPassword('secret123')
  equal(await verifyPassword('secret123', hash), true)
  equal(await verifyPassword('wrong-password', hash), false)
})

test('相同密码每次加盐结果不同', async () => {
  notEqual(await hashPassword('same-password'), await hashPassword('same-password'))
})

test('extractBearerToken 解析 Bearer 头', () => {
  equal(extractBearerToken('Bearer abc.def'), 'abc.def')
  equal(extractBearerToken('abc.def'), '')
  equal(extractBearerToken(undefined), '')
})

test('extractCookieValue 解析指定 Cookie', () => {
  equal(
    extractCookieValue(
      'a=1; devcareer_refresh_token=session.secret; b=2',
      'devcareer_refresh_token',
    ),
    'session.secret',
  )
  equal(extractCookieValue('a=1', 'devcareer_refresh_token'), '')
  equal(extractCookieValue(undefined, 'devcareer_refresh_token'), '')
})
