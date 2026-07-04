import { deepEqual, equal, ok } from 'node:assert/strict'
import { test } from 'node:test'
import { PassThrough } from 'node:stream'
import {
  readChatStream,
  StreamReadError,
} from '../src/modules/ai/providers/openai-compatible.provider'

function sseChunk(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`
}

test('readChatStream 聚合 delta 并提取末尾 usage', async () => {
  const stream = new PassThrough()
  const deltas: string[] = []
  const promise = readChatStream(stream, {
    systemPrompt: '',
    onDelta: (delta) => deltas.push(delta),
  })

  stream.write(sseChunk({ choices: [{ delta: { content: 'Hello' } }] }))
  stream.write(sseChunk({ choices: [{ delta: { content: ' World' } }] }))
  stream.write(
    sseChunk({ choices: [], usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 } }),
  )
  stream.write('data: [DONE]\n\n')
  stream.end()

  const result = await promise
  equal(result.text, 'Hello World')
  deepEqual(result.usage, { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 })
  deepEqual(deltas, ['Hello', ' World'])
})

test('readChatStream 无 usage 分片时 usage 为 undefined（由上层估算兜底）', async () => {
  const stream = new PassThrough()
  const promise = readChatStream(stream, { systemPrompt: '' })

  stream.write(sseChunk({ choices: [{ delta: { content: 'partial' } }] }))
  stream.write('data: [DONE]\n\n')
  stream.end()

  const result = await promise
  equal(result.text, 'partial')
  equal(result.usage, undefined)
})

test('readChatStream 中途出错时携带已收到的部分文本拒绝', async () => {
  const stream = new PassThrough()
  const promise = readChatStream(stream, { systemPrompt: '' })

  stream.write(sseChunk({ choices: [{ delta: { content: '已生成的' } }] }))
  stream.write(sseChunk({ choices: [{ delta: { content: '部分内容' } }] }))
  stream.destroy(new Error('connection reset'))

  try {
    await promise
    ok(false, '应当拒绝')
  } catch (error) {
    ok(error instanceof StreamReadError, '应携带 StreamReadError')
    equal(error.partialText, '已生成的部分内容')
  }
})

test('readChatStream 跨 chunk 切断的 UTF-8 多字节字符不产生乱码', async () => {
  const stream = new PassThrough()
  const deltas: string[] = []
  const promise = readChatStream(stream, {
    systemPrompt: '',
    onDelta: (delta) => deltas.push(delta),
  })

  // 「简历诊断结果」整段 SSE 数据的字节流，故意切在「诊」字的 3 个 UTF-8 字节中间
  const payload =
    sseChunk({ choices: [{ delta: { content: '简历诊断结果' } }] }) + 'data: [DONE]\n\n'
  const bytes = Buffer.from(payload, 'utf8')
  const cutAt = Buffer.byteLength(payload.slice(0, payload.indexOf('诊')), 'utf8') + 1
  stream.write(bytes.subarray(0, cutAt))
  stream.write(bytes.subarray(cutAt))
  stream.end()

  const result = await promise
  equal(result.text, '简历诊断结果')
  ok(!result.text.includes('\uFFFD'), '不应包含 U+FFFD 替换字符')
  equal(deltas.join(''), '简历诊断结果')
})

test('readChatStream 忽略不完整/非法的 SSE 分片', async () => {
  const stream = new PassThrough()
  const promise = readChatStream(stream, { systemPrompt: '' })

  stream.write('data: {broken json}\n\n')
  stream.write(': comment line\n\n')
  stream.write(sseChunk({ choices: [{ delta: { content: 'ok' } }] }))
  stream.write('data: [DONE]\n\n')
  stream.end()

  const result = await promise
  equal(result.text, 'ok')
})
