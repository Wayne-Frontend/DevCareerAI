import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { notify } from '../utils/notify'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 120000,
})

service.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[] }>) => {
    const rawMessage = error.response?.data?.message || error.message || '请求失败'
    const message = Array.isArray(rawMessage) ? rawMessage.join('；') : rawMessage
    notify(message, 'error')
    return Promise.reject(error)
  },
)

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await service.request<T>(config)
  return response.data
}
