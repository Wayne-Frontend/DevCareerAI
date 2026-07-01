import { equal } from 'node:assert/strict'
import { test } from 'node:test'
import { resolveThrottleTracker } from '../src/common/guards/user-throttler.guard'

test('已登录按 user id 计数', () => {
  equal(resolveThrottleTracker({ user: { id: 'u1' }, ip: '1.2.3.4' }), 'user:u1')
})

test('未登录退回按 IP', () => {
  equal(resolveThrottleTracker({ ip: '1.2.3.4' }), '1.2.3.4')
})

test('存在代理链时取 ips[0]', () => {
  equal(resolveThrottleTracker({ ips: ['9.9.9.9'], ip: '1.2.3.4' }), '9.9.9.9')
})
