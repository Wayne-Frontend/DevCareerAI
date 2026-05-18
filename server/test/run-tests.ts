import { deepEqual, match } from 'node:assert/strict'
import { safeParseJson } from '../src/common/utils/json-response.util'
import { limitText, limitTextForAi } from '../src/common/utils/text-limit.util'

function testSafeParseJson() {
  deepEqual(safeParseJson<{ ok: boolean }>('```json\n{"ok":true}\n```'), { ok: true })
  deepEqual(safeParseJson<{ ok: boolean }>('not-json'), {
    rawText: 'not-json',
    parseError: true,
  })
}

function testTextLimits() {
  deepEqual(limitText('abc', 5), { text: 'abc', truncated: false })
  deepEqual(limitText('abcdef', 3), { text: 'abc', truncated: true })
  match(limitTextForAi('abcdef', 3), /original text is longer than 3 characters/)
}

const tests = [testSafeParseJson, testTextLimits]

for (const test of tests) {
  test()
}

console.log(`${tests.length} tests passed`)
