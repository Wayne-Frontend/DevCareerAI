import { equal, notEqual } from 'node:assert/strict'
import { test } from 'node:test'
import { extractBearerToken, hashPassword, verifyPassword } from '../src/modules/auth/auth.service'

test('密码哈希可被正确校验', () => {
  const hash = hashPassword('secret123')
  equal(verifyPassword('secret123', hash), true)
  equal(verifyPassword('wrong-password', hash), false)
})

test('相同密码每次加盐结果不同', () => {
  notEqual(hashPassword('same-password'), hashPassword('same-password'))
})

test('extractBearerToken 解析 Bearer 头', () => {
  equal(extractBearerToken('Bearer abc.def'), 'abc.def')
  equal(extractBearerToken('abc.def'), '')
  equal(extractBearerToken(undefined), '')
})
