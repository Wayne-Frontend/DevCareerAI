import { getAuthToken } from '@/utils/authSession'
import { redirectToLogin } from '@/utils/redirectToLogin'
import { ensureFreshAccessToken } from './authRefresh'
import { notifyApiError, resolveFetchErrorMessage } from './errors'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export interface StreamHandlers {
  signal?: AbortSignal
  onStart?: (data: unknown) => void
  onDelta?: (delta: string) => void
}

export async function streamRequest<TDone>(
  url: string,
  data: unknown,
  handlers: StreamHandlers = {},
): Promise<TDone> {
  let response: Response

  try {
    await ensureFreshAccessToken()
  } catch {
    const message = '登录状态已失效，请重新登录'
    notifyApiError(message)
    redirectToLogin()
    throw new Error(message)
  }

  try {
    response = await postStream(url, data, handlers.signal)
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error
    }

    const message = '网络连接失败，请确认后端服务是否正在运行'
    notifyApiError(message)
    throw new Error(message)
  }

  if (response.status === 401) {
    try {
      await ensureFreshAccessToken(true)
      response = await postStream(url, data, handlers.signal)
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw error
      }

      // 刷新失败本质是鉴权失效，与预刷新失败分支保持同一文案；
      // 此处的 response 仍是首次 401 的响应，从它解析文案并不可靠。
      const message = '登录状态已失效，请重新登录'
      notifyApiError(message)
      redirectToLogin()
      throw new Error(message)
    }
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

  const handleEvent = (eventBlock: string) => {
    const event = parseSseEvent<TDone>(eventBlock)
    if (!event) return

    if (event.event === 'start') {
      handlers.onStart?.(event.data)
    }

    if (event.event === 'delta') {
      const payload = event.data as { delta?: string }
      handlers.onDelta?.(payload.delta || '')
    }

    if (event.event === 'done') {
      donePayload = event.data as TDone
    }

    if (event.event === 'error') {
      const payload = event.data as { message?: string }
      const message = payload.message || '请求失败，请稍后再试'
      notifyApiError(message)
      throw new Error(message)
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split(/\n\n/)
      buffer = events.pop() || ''

      for (const eventBlock of events) {
        handleEvent(eventBlock)
      }
    }

    // 后端最后一个事件块可能不带 \n\n 收尾，残留在 buffer 里的 done 事件同样要解析，
    // 否则会误报「流式响应未返回最终结果」。
    buffer += decoder.decode()
    if (buffer.trim()) {
      handleEvent(buffer)
    }
  } finally {
    // 错误/取消路径下显式释放底层连接，避免 reader 悬挂占用浏览器同域连接额度。
    void reader.cancel().catch(() => undefined)
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

function postStream(url: string, data: unknown, signal?: AbortSignal) {
  const token = getAuthToken()

  return fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    credentials: 'include',
    signal,
  })
}
