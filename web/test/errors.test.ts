import type { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import type { ApiErrorPayload } from '../src/api/errors'
import { resolveApiErrorMessage } from '../src/api/errors'

function asAxiosError(partial: Partial<AxiosError<ApiErrorPayload>>): AxiosError<ApiErrorPayload> {
  return partial as AxiosError<ApiErrorPayload>
}

describe('resolveApiErrorMessage', () => {
  it('优先取后端返回的 message', () => {
    const error = asAxiosError({
      response: { data: { message: '账号或密码不正确' }, status: 401 } as AxiosError<ApiErrorPayload>['response'],
    })
    expect(resolveApiErrorMessage(error)).toBe('账号或密码不正确')
  })

  it('message 为数组时用「；」拼接', () => {
    const error = asAxiosError({
      response: { data: { message: ['邮箱不能为空', '密码太短'] }, status: 400 } as AxiosError<ApiErrorPayload>['response'],
    })
    expect(resolveApiErrorMessage(error)).toBe('邮箱不能为空；密码太短')
  })

  it('无 message 时回退到状态码文案', () => {
    const error = asAxiosError({
      response: { data: {}, status: 403 } as AxiosError<ApiErrorPayload>['response'],
    })
    expect(resolveApiErrorMessage(error)).toBe('没有权限执行此操作')
  })

  it('超时错误', () => {
    expect(resolveApiErrorMessage(asAxiosError({ code: 'ECONNABORTED' }))).toBe('请求超时，请稍后重试')
  })

  it('网络错误', () => {
    expect(resolveApiErrorMessage(asAxiosError({ message: 'Network Error' }))).toBe(
      '网络连接失败，请确认后端服务是否正在运行',
    )
  })

  it('未知错误回退到兜底文案', () => {
    expect(resolveApiErrorMessage(asAxiosError({}))).toBe('请求失败，请稍后再试')
  })
})
