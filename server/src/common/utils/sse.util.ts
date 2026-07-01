import type { Response } from 'express'

export interface SseSession {
  signal: AbortSignal
  end: () => void
}

export function createSseSession(res: Response): SseSession {
  const controller = new AbortController()
  let completed = false

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  res.on('close', () => {
    if (!completed) {
      controller.abort()
    }
  })

  return {
    signal: controller.signal,
    end: () => {
      completed = true
      res.end()
    },
  }
}

export function writeSseEvent(res: Response, event: string, data: unknown) {
  if (res.destroyed || res.writableEnded) return

  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed'
}

export interface SseStreamCallbacks {
  signal: AbortSignal
  onDelta: (delta: string) => void
  onUsage: (usage: unknown) => void
}

/**
 * 统一的 SSE 流程：开启会话 → 发 start → 执行生成（把 delta/usage 回调接到 SSE 事件）
 * → 发 done，出错发 error，最后收尾。各流式控制器方法只需提供起始消息和生成逻辑。
 */
export async function runSseStream<T>(
  res: Response,
  startMessage: string,
  run: (callbacks: SseStreamCallbacks) => Promise<T>,
): Promise<void> {
  const session = createSseSession(res)
  writeSseEvent(res, 'start', { message: startMessage })

  try {
    const result = await run({
      signal: session.signal,
      onDelta: (delta) => writeSseEvent(res, 'delta', { delta }),
      onUsage: (usage) => writeSseEvent(res, 'usage', usage),
    })
    writeSseEvent(res, 'done', result)
  } catch (error) {
    writeSseEvent(res, 'error', { message: getErrorMessage(error) })
  } finally {
    session.end()
  }
}
