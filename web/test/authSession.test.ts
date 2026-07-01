import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AuthSession } from '../src/types/auth'
import {
  clearStoredAuthSession,
  getAuthToken,
  getStoredAuthSession,
  setStoredAuthSession,
  updateStoredAuthUser,
} from '../src/utils/authSession'

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    token: 'tok_123',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: {
      id: 'u1',
      username: 'alice',
      email: 'alice@example.com',
      role: 'user',
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
    expect(getStoredAuthSession()?.token).toBe('tok_123')
    expect(localStorage.getItem('devcareer-auth-session')).toBeTruthy()
    expect(sessionStorage.getItem('devcareer-auth-session')).toBeNull()
  })

  it('remember=false 存 sessionStorage', () => {
    setStoredAuthSession(makeSession(), false)
    expect(getStoredAuthSession()?.token).toBe('tok_123')
    expect(sessionStorage.getItem('devcareer-auth-session')).toBeTruthy()
    expect(localStorage.getItem('devcareer-auth-session')).toBeNull()
  })

  it('切换存储位置时清掉另一处，避免残留', () => {
    setStoredAuthSession(makeSession(), true)
    setStoredAuthSession(makeSession({ token: 'tok_new' }), false)
    expect(localStorage.getItem('devcareer-auth-session')).toBeNull()
    expect(getAuthToken()).toBe('tok_new')
  })
})

describe('过期与容错', () => {
  it('过期会话读取时返回 null 并清除', () => {
    setStoredAuthSession(makeSession({ expiresAt: new Date(Date.now() - 1000).toISOString() }), true)
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
  it('更新用户信息但保留 token（localStorage）', () => {
    setStoredAuthSession(makeSession(), true)
    updateStoredAuthUser({
      id: 'u1',
      username: 'alice2',
      email: 'alice2@example.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
    })
    const stored = getStoredAuthSession()
    expect(stored?.token).toBe('tok_123')
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
