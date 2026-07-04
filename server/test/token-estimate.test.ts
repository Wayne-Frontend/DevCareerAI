import { equal, ok } from 'node:assert/strict'
import { test } from 'node:test'
import { estimateTokens } from '../src/common/utils/token-estimate.util'

test('空文本估算为 0', () => {
  equal(estimateTokens(''), 0)
})

test('纯英文按约 4 字符/token 估算', () => {
  const text = 'a'.repeat(400)
  equal(estimateTokens(text), 100)
})

test('纯中文按约 0.6 token/字估算', () => {
  const text = '简'.repeat(100)
  equal(estimateTokens(text), 60)
})

test('中英混合分别按各自系数累加', () => {
  // 100 个中文字 (60) + 400 个英文字符 (100) = 160
  const text = '历'.repeat(100) + 'b'.repeat(400)
  equal(estimateTokens(text), 160)
})

test('估算值向上取整且不为负', () => {
  ok(estimateTokens('a') >= 1)
  ok(estimateTokens('中') >= 1)
})
