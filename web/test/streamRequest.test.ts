import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseSseEvent, streamRequest } from '../src/api/streamRequest'

const notifyApiErrorMock = vi.hoisted(() => vi.fn())

vi.mock('../src/api/authRefresh', () => ({
  ensureFreshAccessToken: vi.fn().mockResolvedValue('token'),
}))
vi.mock('../src/api/errors', () => ({
  notifyApiError: notifyApiErrorMock,
  resolveFetchErrorMessage: vi.fn().mockResolvedValue('请求失败'),
}))
vi.mock('../src/utils/redirectToLogin', () => ({
  redirectToLogin: vi.fn(),
}))
vi.mock('../src/utils/authSession', () => ({
  getAuthToken: () => 'token',
}))

/** 构造一个按分片吐出 SSE 文本的 200 响应 */
function sseResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

describe('streamRequest 主流程', () => {
  beforeEach(() => {
    notifyApiErrorMock.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('正常流：触发 onStart/onDelta 并返回 done payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'event: start\ndata: {}\n\n',
            'event: delta\ndata: {"delta":"A"}\n\nevent: delta\ndata: {"delta":"B"}\n\n',
            'event: done\ndata: {"ok":1}\n\n',
          ]),
        ),
    )
    const onStart = vi.fn()
    const deltas: string[] = []

    const result = await streamRequest<{ ok: number }>('/x/stream', undefined, {
      onStart,
      onDelta: (delta) => deltas.push(delta),
    })

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(deltas).toEqual(['A', 'B'])
    expect(result).toEqual({ ok: 1 })
    expect(notifyApiErrorMock).not.toHaveBeenCalled()
  })

  it('流末 done 事件不带空行收尾也能解析（残留 buffer 兜底）', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          sseResponse(['event: delta\ndata: {"delta":"A"}\n\n', 'event: done\ndata: {"ok":2}']),
        ),
    )

    const result = await streamRequest<{ ok: number }>('/x/stream', undefined, {})

    expect(result).toEqual({ ok: 2 })
    expect(notifyApiErrorMock).not.toHaveBeenCalled()
  })

  it('error 事件：弹一次全局错误并抛出后端 message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(sseResponse(['event: error\ndata: {"message":"模型服务过载"}\n\n'])),
    )

    await expect(streamRequest('/x/stream', undefined, {})).rejects.toThrow('模型服务过载')
    expect(notifyApiErrorMock).toHaveBeenCalledTimes(1)
    expect(notifyApiErrorMock).toHaveBeenCalledWith('模型服务过载')
  })
})

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
