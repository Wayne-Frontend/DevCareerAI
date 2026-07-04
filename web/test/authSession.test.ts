import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AuthSession } from '../src/types/auth'
import {
  clearStoredAuthSession,
  getAuthToken,
  getStoredAuthSession,
  replaceStoredAuthSession,
  setStoredAuthSession,
  shouldRefreshAuthToken,
  updateStoredAuthUser,
} from '../src/utils/authSession'

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access_123',
    accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: {
      id: 'u1',
      username: 'alice',
      email: 'alice@example.com',
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('setStoredAuthSession / getStoredAuthSession', () => {
  it('remember=true 存 localStorage', () => {
    setStoredAuthSession(makeSession(), true)
    expect(getStoredAuthSession()?.accessToken).toBe('access_123')
    expect(localStorage.getItem('devcareer-auth-session')).toBeTruthy()
    expect(sessionStorage.getItem('devcareer-auth-session')).toBeNull()
  })

  it('remember=false 存 sessionStorage', () => {
    setStoredAuthSession(makeSession(), false)
    expect(getStoredAuthSession()?.accessToken).toBe('access_123')
    expect(sessionStorage.getItem('devcareer-auth-session')).toBeTruthy()
    expect(localStorage.getItem('devcareer-auth-session')).toBeNull()
  })

  it('切换存储位置时清掉另一处，避免残留', () => {
    setStoredAuthSession(makeSession(), true)
    setStoredAuthSession(makeSession({ accessToken: 'access_new' }), false)
    expect(localStorage.getItem('devcareer-auth-session')).toBeNull()
    expect(getAuthToken()).toBe('access_new')
  })

  it('replaceStoredAuthSession 保持原存储位置', () => {
    setStoredAuthSession(makeSession(), true)
    replaceStoredAuthSession(makeSession({ accessToken: 'access_refreshed' }))
    expect(localStorage.getItem('devcareer-auth-session')).toContain('access_refreshed')
    expect(sessionStorage.getItem('devcareer-auth-session')).toBeNull()
  })
})

describe('过期与容错', () => {
  it('access token 临近过期时应触发刷新判断', () => {
    setStoredAuthSession(
      makeSession({ accessTokenExpiresAt: new Date(Date.now() + 1000).toISOString() }),
      true,
    )
    expect(shouldRefreshAuthToken()).toBe(true)
    expect(getAuthToken()).toBe('access_123')
  })

  it('旧结构会返回 null 并清除', () => {
    localStorage.setItem(
      'devcareer-auth-session',
      JSON.stringify({
        token: 'old_token',
        expiresAt: new Date().toISOString(),
        user: { id: 'u1' },
      }),
    )
    expect(getStoredAuthSession()).toBeNull()
    expect(localStorage.getItem('devcareer-auth-session')).toBeNull()
  })

  it('脏 JSON 返回 null 并清除', () => {
    localStorage.setItem('devcareer-auth-session', '{not json')
    expect(getStoredAuthSession()).toBeNull()
    expect(localStorage.getItem('devcareer-auth-session')).toBeNull()
  })

  it('无会话时 getAuthToken 返回空串', () => {
    expect(getAuthToken()).toBe('')
  })
})

describe('updateStoredAuthUser', () => {
  it('更新用户信息但保留 accessToken（localStorage）', () => {
    setStoredAuthSession(makeSession(), true)
    updateStoredAuthUser({
      id: 'u1',
      username: 'alice2',
      email: 'alice2@example.com',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
    })
    const stored = getStoredAuthSession()
    expect(stored?.accessToken).toBe('access_123')
    expect(stored?.user.username).toBe('alice2')
    expect(stored?.user.role).toBe('admin')
  })
})

describe('clearStoredAuthSession', () => {
  it('两处存储都清除', () => {
    setStoredAuthSession(makeSession(), true)
    clearStoredAuthSession()
    expect(getStoredAuthSession()).toBeNull()
    expect(localStorage.getItem('devcareer-auth-session')).toBeNull()
    expect(sessionStorage.getItem('devcareer-auth-session')).toBeNull()
  })
})
