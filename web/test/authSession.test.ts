import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AuthSession, AuthUser } from '../src/types/auth'
import {
  applyRefreshedAuthSession,
  clearStoredAuthSession,
  getAuthToken,
  getStoredAuthUser,
  setStoredAuthSession,
  shouldRefreshAuthToken,
  updateStoredAuthUser,
} from '../src/utils/authSession'

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u1',
    username: 'alice',
    email: 'alice@example.com',
    role: 'user',
    status: 'active',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access_123',
    accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: makeUser(),
    ...overrides,
  }
}

beforeEach(() => {
  clearStoredAuthSession()
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  clearStoredAuthSession()
  localStorage.clear()
  sessionStorage.clear()
})

describe('accessToken 只存内存', () => {
  it('setStoredAuthSession 后 token 可用，但任何 storage 中都不出现 token', () => {
    setStoredAuthSession(makeSession(), true)

    expect(getAuthToken()).toBe('access_123')
    const allStored = [
      ...Object.keys(localStorage).map((key) => localStorage.getItem(key)),
      ...Object.keys(sessionStorage).map((key) => sessionStorage.getItem(key)),
    ].join('')
    expect(allStored).not.toContain('access_123')
  })

  it('remember=true 用户资料存 localStorage，false 存 sessionStorage', () => {
    setStoredAuthSession(makeSession(), true)
    expect(localStorage.getItem('devcareer-auth-user')).toBeTruthy()
    expect(sessionStorage.getItem('devcareer-auth-user')).toBeNull()

    setStoredAuthSession(makeSession(), false)
    expect(localStorage.getItem('devcareer-auth-user')).toBeNull()
    expect(sessionStorage.getItem('devcareer-auth-user')).toBeTruthy()
  })

  it('clearStoredAuthSession 同时清内存 token 和存储资料', () => {
    setStoredAuthSession(makeSession(), true)
    clearStoredAuthSession()
    expect(getAuthToken()).toBe('')
    expect(getStoredAuthUser()).toBeNull()
  })
})

describe('shouldRefreshAuthToken', () => {
  it('无内存 token 但有本地资料（页面刚刷新）→ 需要 refresh', () => {
    localStorage.setItem('devcareer-auth-user', JSON.stringify(makeUser()))
    expect(shouldRefreshAuthToken()).toBe(true)
  })

  it('无内存 token 且无本地资料（未登录）→ 不需要 refresh', () => {
    expect(shouldRefreshAuthToken()).toBe(false)
  })

  it('内存 token 临近过期 → 需要 refresh', () => {
    setStoredAuthSession(
      makeSession({ accessTokenExpiresAt: new Date(Date.now() + 1000).toISOString() }),
      true,
    )
    expect(shouldRefreshAuthToken()).toBe(true)
  })

  it('内存 token 距离过期还早 → 不需要 refresh', () => {
    setStoredAuthSession(
      makeSession({ accessTokenExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString() }),
      true,
    )
    expect(shouldRefreshAuthToken()).toBe(false)
  })
})

describe('applyRefreshedAuthSession / updateStoredAuthUser', () => {
  it('refresh 后替换内存 token 并保持资料存储位置', () => {
    setStoredAuthSession(makeSession(), false)
    applyRefreshedAuthSession(makeSession({ accessToken: 'access_refreshed' }))

    expect(getAuthToken()).toBe('access_refreshed')
    expect(sessionStorage.getItem('devcareer-auth-user')).toBeTruthy()
    expect(localStorage.getItem('devcareer-auth-user')).toBeNull()
  })

  it('updateStoredAuthUser 更新资料且不影响内存 token', () => {
    setStoredAuthSession(makeSession(), true)
    updateStoredAuthUser(makeUser({ username: 'alice2', role: 'admin' }))

    expect(getAuthToken()).toBe('access_123')
    expect(getStoredAuthUser()?.username).toBe('alice2')
    expect(getStoredAuthUser()?.role).toBe('admin')
  })
})

describe('旧版本数据迁移', () => {
  it('旧键中的用户资料迁移到新键，token 被丢弃', () => {
    localStorage.setItem('devcareer-auth-session', JSON.stringify(makeSession()))

    const user = getStoredAuthUser()
    expect(user?.id).toBe('u1')
    expect(localStorage.getItem('devcareer-auth-session')).toBeNull()
    expect(localStorage.getItem('devcareer-auth-user')).not.toContain('access_123')
  })

  it('旧键脏数据直接清除', () => {
    localStorage.setItem('devcareer-auth-session', '{not json')
    expect(getStoredAuthUser()).toBeNull()
    expect(localStorage.getItem('devcareer-auth-session')).toBeNull()
  })

  it('新键脏数据返回 null 并清除', () => {
    localStorage.setItem('devcareer-auth-user', '{broken')
    expect(getStoredAuthUser()).toBeNull()
    expect(localStorage.getItem('devcareer-auth-user')).toBeNull()
  })
})
