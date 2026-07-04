import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { getAuthToken } from '@/utils/authSession'
import { redirectToLogin } from '@/utils/redirectToLogin'
import { ensureFreshAccessToken } from './authRefresh'
import { notifyApiError, resolveApiErrorMessage, type ApiErrorPayload } from './errors'

interface RetryableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean
}

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 120000,
  withCredentials: true,
})

service.interceptors.request.use((config) => {
  const token = getAuthToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

service.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const originalConfig = error.config as RetryableRequestConfig | undefined

    if (shouldAttemptRefresh(error, originalConfig)) {
      originalConfig!._retry = true

      try {
        const accessToken = await ensureFreshAccessToken(true)
        originalConfig!.headers = {
          ...(originalConfig!.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        }
        return service.request(originalConfig!)
      } catch {
        const message = resolveApiErrorMessage(error)
        notifyApiError(message)
        redirectToLogin()
        return Promise.reject(error)
      }
    }

    const message = resolveApiErrorMessage(error)
    notifyApiError(message)

    if (error.response?.status === 401) {
      redirectToLogin()
    }

    return Promise.reject(error)
  },
)

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await service.request<T>(config)
  return response.data
}

function shouldAttemptRefresh(
  error: AxiosError<ApiErrorPayload>,
  config: RetryableRequestConfig | undefined,
) {
  if (error.response?.status !== 401 || !config || config._retry) return false

  const url = config.url || ''
  if (
    ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].some((item) =>
      url.includes(item),
    )
  ) {
    return false
  }

  return true
}
