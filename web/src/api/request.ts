import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { clearStoredAuthSession, getAuthToken } from '../utils/authSession'
import { notifyApiError, resolveApiErrorMessage, type ApiErrorPayload } from './errors'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 120000,
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
  (error: AxiosError<ApiErrorPayload>) => {
    const message = resolveApiErrorMessage(error)
    notifyApiError(message)

    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      clearStoredAuthSession()
      window.location.assign('/login')
    }

    return Promise.reject(error)
  },
)

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await service.request<T>(config)
  return response.data
}
