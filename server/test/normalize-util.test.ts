import { deepEqual, equal } from 'node:assert/strict'
import { test } from 'vitest'
import { clampScore, toStringList } from '../src/common/utils/normalize.util'

test('clampScore 限制在 0-100 并取整', () => {
  equal(clampScore(250), 100)
  equal(clampScore(-5), 0)
  equal(clampScore(87.6), 88)
  equal(clampScore('not-a-number'), 0)
  equal(clampScore(undefined), 0)
})

test('toStringList 过滤空值并转字符串', () => {
  deepEqual(toStringList(['a', '', 'b']), ['a', 'b'])
  deepEqual(toStringList([1, 2]), ['1', '2'])
  deepEqual(toStringList('not-an-array'), [])
  deepEqual(toStringList(undefined), [])
})
