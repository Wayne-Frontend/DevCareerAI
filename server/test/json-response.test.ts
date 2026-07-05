import { deepEqual, equal } from 'node:assert/strict'
import { test } from 'vitest'
import { cleanJsonResponse, safeParseJson } from '../src/common/utils/json-response.util'

test('safeParseJson 去除代码块围栏并解析', () => {
  deepEqual(safeParseJson<{ ok: boolean }>('```json\n{"ok":true}\n```'), { ok: true })
})

test('safeParseJson 非法 JSON 返回降级结构', () => {
  deepEqual(safeParseJson<{ ok: boolean }>('not-json'), { rawText: 'not-json', parseError: true })
})

test('cleanJsonResponse 去除 ``` 围栏', () => {
  equal(cleanJsonResponse('```json\n{"a":1}\n```'), '{"a":1}')
})
