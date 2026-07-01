import { describe, expect, it } from 'vitest'
import { parseSseEvent } from '../src/api/streamRequest'

describe('parseSseEvent', () => {
  it('解析标准 event + data 块', () => {
    const block = 'event: delta\ndata: {"delta":"你好"}'
    expect(parseSseEvent(block)).toEqual({ event: 'delta', data: { delta: '你好' } })
  })

  it('解析 done 事件的复杂 payload', () => {
    const block = 'event: done\ndata: {"score":88,"cached":false}'
    expect(parseSseEvent(block)).toEqual({ event: 'done', data: { score: 88, cached: false } })
  })

  it('缺少 event 行返回 null', () => {
    expect(parseSseEvent('data: {"delta":"x"}')).toBeNull()
  })

  it('缺少 data 行返回 null', () => {
    expect(parseSseEvent('event: start')).toBeNull()
  })

  it('data 非法 JSON 返回 null（跳过脏分片）', () => {
    expect(parseSseEvent('event: delta\ndata: {broken')).toBeNull()
  })

  it('兼容 \\r\\n 换行', () => {
    const block = 'event: usage\r\ndata: {"total_tokens":120}'
    expect(parseSseEvent(block)).toEqual({ event: 'usage', data: { total_tokens: 120 } })
  })

  it('拼接多行 data', () => {
    const block = 'event: done\ndata: {"a":1,\ndata: "b":2}'
    expect(parseSseEvent(block)).toEqual({ event: 'done', data: { a: 1, b: 2 } })
  })
})
