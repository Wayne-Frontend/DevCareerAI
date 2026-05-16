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
