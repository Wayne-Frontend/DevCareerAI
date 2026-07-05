import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'

vi.mock('@/utils/authSession', () => ({ getAuthToken: vi.fn(() => null) }))
vi.mock('@/utils/redirectToLogin', () => ({ redirectToLogin: vi.fn() }))
vi.mock('@/api/authRefresh', () => ({ ensureFreshAccessToken: vi.fn() }))
vi.mock('@/api/errors', () => ({
  notifyApiError: vi.fn(),
  resolveApiErrorMessage: vi.fn(() => '请求失败'),
}))

import { httpClient, request } from '@/api/request'
import { ensureFreshAccessToken } from '@/api/authRefresh'
import { redirectToLogin } from '@/utils/redirectToLogin'

const mockedRefresh = vi.mocked(ensureFreshAccessToken)
const mockedRedirect = vi.mocked(redirectToLogin)

function unauthorized(config: InternalAxiosRequestConfig) {
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
    status: 401,
    statusText: 'Unauthorized',
    data: { message: 'Unauthorized' },
    headers: {},
    config,
  })
}

/** 用自定义 adapter 替代真实网络：按调用序返回预设结果。 */
function installAdapter(
  handler: (config: InternalAxiosRequestConfig, callIndex: number) => unknown,
) {
  let calls = 0
  const configs: InternalAxiosRequestConfig[] = []
  httpClient.defaults.adapter = async (config) => {
    configs.push(config)
    const result = handler(config, calls++)
    if (result instanceof Error) throw result
    return {
      status: 200,
      statusText: 'OK',
      data: result,
      headers: {},
      config,
    }
  }
  return configs
}

describe('request 401 刷新拦截器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('业务接口 401：先刷新 token，再携新 Authorization 重放原请求', async () => {
    mockedRefresh.mockResolvedValue('new-token')
    const configs = installAdapter((config, index) =>
      index === 0 ? unauthorized(config) : { ok: true },
    )

    const result = await request<{ ok: boolean }>({ url: '/resumes' })

    expect(result).toEqual({ ok: true })
    expect(mockedRefresh).toHaveBeenCalledWith(true)
    expect(configs.length).toBe(2)
    expect(configs[1].headers.Authorization).toBe('Bearer new-token')
    expect(mockedRedirect).not.toHaveBeenCalled()
  })

  it('登录接口自身的 401 不触发刷新，直接跳登录', async () => {
    const configs = installAdapter((config) => unauthorized(config))

    await expect(request({ url: '/auth/login', method: 'post' })).rejects.toThrow()

    expect(mockedRefresh).not.toHaveBeenCalled()
    expect(mockedRedirect).toHaveBeenCalled()
    expect(configs.length).toBe(1)
  })

  it('刷新失败：跳登录并以原错误 reject，不重放请求', async () => {
    mockedRefresh.mockRejectedValue(new Error('refresh expired'))
    const configs = installAdapter((config) => unauthorized(config))

    await expect(request({ url: '/resumes' })).rejects.toThrow('Unauthorized')

    expect(mockedRedirect).toHaveBeenCalled()
    expect(configs.length).toBe(1)
  })

  it('_retry 防死循环：重放后再次 401 不会二次刷新', async () => {
    mockedRefresh.mockResolvedValue('new-token')
    const configs = installAdapter((config) => unauthorized(config))

    await expect(request({ url: '/resumes' })).rejects.toThrow()

    expect(mockedRefresh).toHaveBeenCalledTimes(1)
    expect(configs.length).toBe(2)
    expect(mockedRedirect).toHaveBeenCalled()
  })
})
