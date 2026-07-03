import { getAuthToken } from '@/utils/authSession'
import { redirectToLogin } from '@/utils/redirectToLogin'
import { notifyApiError, resolveFetchErrorMessage } from './errors'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export interface StreamHandlers<TDone> {
  signal?: AbortSignal
  onStart?: (data: unknown) => void
  onDelta?: (delta: string) => void
  onUsage?: (usage: unknown) => void
  onDone?: (data: TDone) => void
  onError?: (message: string) => void
}

export async function streamRequest<TDone>(
  url: string,
  data: unknown,
  handlers: StreamHandlers<TDone> = {},
): Promise<TDone> {
  let response: Response

  try {
    const token = getAuthToken()
    response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: handlers.signal,
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error
    }

    const message = '网络连接失败，请确认后端服务是否正在运行'
    notifyApiError(message)
    throw new Error(message)
  }

  if (!response.ok || !response.body) {
    const message = await resolveFetchErrorMessage(response)
    notifyApiError(message)

    if (response.status === 401) {
      redirectToLogin()
    }

    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let donePayload: TDone | null = null

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split(/\n\n/)
      buffer = events.pop() || ''

      for (const eventBlock of events) {
        const event = parseSseEvent<TDone>(eventBlock)
        if (!event) continue

        if (event.event === 'start') {
          handlers.onStart?.(event.data)
        }

        if (event.event === 'delta') {
          const payload = event.data as { delta?: string }
          handlers.onDelta?.(payload.delta || '')
        }

        if (event.event === 'usage') {
          handlers.onUsage?.(event.data)
        }

        if (event.event === 'done') {
          donePayload = event.data as TDone
          handlers.onDone?.(donePayload)
        }

        if (event.event === 'error') {
          const payload = event.data as { message?: string }
          const message = payload.message || '请求失败，请稍后再试'
          handlers.onError?.(message)
          notifyApiError(message)
          throw new Error(message)
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error
    }

    throw error
  }

  if (!donePayload) {
    const message = '流式响应未返回最终结果'
    notifyApiError(message)
    throw new Error(message)
  }

  return donePayload
}

export function parseSseEvent<TDone>(
  block: string,
): { event: string; data: unknown | TDone } | null {
  const lines = block.split(/\r?\n/)
  const event = lines
    .find((line) => line.startsWith('event:'))
    ?.replace(/^event:\s*/, '')
    .trim()
  const dataLines = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s*/, ''))

  if (!event || dataLines.length === 0) return null

  try {
    return {
      event,
      data: JSON.parse(dataLines.join('\n')),
    }
  } catch {
    return null
  }
}
