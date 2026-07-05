import { deepEqual, match } from 'node:assert/strict'
import { test } from 'vitest'
import { limitText, limitTextForAi } from '../src/common/utils/text-limit.util'

test('limitText 未超长原样返回', () => {
  deepEqual(limitText('abc', 5), { text: 'abc', truncated: false })
})

test('limitText 超长截断并标记', () => {
  deepEqual(limitText('abcdef', 3), { text: 'abc', truncated: true })
})

test('limitTextForAi 超长时追加截断提示', () => {
  match(limitTextForAi('abcdef', 3), /original text is longer than 3 characters/)
})
