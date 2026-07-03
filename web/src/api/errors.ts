import type { AxiosError } from 'axios'
import { notify } from '@/utils/notify'

export interface ApiErrorPayload {
  message?: string | string[]
  error?: string
  statusCode?: number
}

export function resolveApiErrorMessage(error: AxiosError<ApiErrorPayload>) {
  if (error.response) {
    return normalizeMessage(
      error.response.data?.message ||
        error.response.data?.error ||
        getStatusMessage(error.response.status),
    )
  }

  if (error.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试'
  }

  if (error.message === 'Network Error') {
    return '网络连接失败，请确认后端服务是否正在运行'
  }

  return error.message || '请求失败，请稍后再试'
}

export async function resolveFetchErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload
    return normalizeMessage(payload.message || payload.error || getStatusMessage(response.status))
  } catch {
    return response.statusText || getStatusMessage(response.status)
  }
}

export function notifyApiError(message: string) {
  notify(message || '请求失败，请稍后再试', 'error')
}

function normalizeMessage(message: string | string[] | undefined) {
  if (Array.isArray(message)) return message.filter(Boolean).join('；')
  return message || '请求失败，请稍后再试'
}

function getStatusMessage(status?: number) {
  switch (status) {
    case 400:
      return '请求参数有误，请检查后重试'
    case 401:
      return '登录状态已失效，请重新登录'
    case 403:
      return '没有权限执行此操作'
    case 404:
      return '请求的资源不存在'
    case 409:
      return '数据冲突，请刷新后重试'
    case 413:
      return '上传文件过大，请压缩后重试'
    case 422:
      return '提交内容未通过校验，请检查后重试'
    case 500:
      return '服务暂时不可用，请稍后再试'
    case 503:
      return 'AI 服务暂时不可用，请稍后再试'
    default:
      return '请求失败，请稍后再试'
  }
}
