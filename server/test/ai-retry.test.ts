import { equal, ok } from 'node:assert/strict'
import { test } from 'vitest'
import { applyStrictJsonRetry } from '../src/common/utils/ai-retry.util'

const payload = {
  systemPrompt: 'sys',
  userPrompt: '请分析这份简历',
  temperature: 0.2,
  maxTokens: 2000,
}

test('非重试请求返回原载荷', () => {
  const result = applyStrictJsonRetry(payload, { retry: false })
  equal(result, payload)
})

test('重试时 maxTokens 上调 50% 并追加严格 JSON 指令', () => {
  const result = applyStrictJsonRetry(payload, { retry: true })
  equal(result.maxTokens, 3000)
  ok(result.userPrompt.startsWith('请分析这份简历'), '原始提示词应保留')
  ok(result.userPrompt.includes('合法的 JSON'), '应追加严格 JSON 指令')
  equal(payload.maxTokens, 2000, '原载荷不应被修改')
})
