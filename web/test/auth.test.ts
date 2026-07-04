import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AuthSession } from '../src/types/auth'
import { useAuthStore } from '../src/stores/auth'

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access_abc',
    accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: {
      id: 'u1',
      username: 'bob',
      email: 'bob@example.com',
      role: 'user',
      status: 'active',
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    },
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('useAuthStore', () => {
  it('初始未登录', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.token).toBe('')
  })

  it('setSession 后进入已登录状态', () => {
    const store = useAuthStore()
    store.setSession(makeSession(), true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.token).toBe('access_abc')
    expect(store.user?.email).toBe('bob@example.com')
  })

  it('updateUser 只改用户、保留 accessToken', () => {
    const store = useAuthStore()
    store.setSession(makeSession(), true)
    store.updateUser({
      id: 'u1',
      username: 'bob2',
      email: 'bob2@example.com',
      role: 'admin',
      status: 'active',
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    })
    expect(store.token).toBe('access_abc')
    expect(store.user?.username).toBe('bob2')
    expect(store.user?.role).toBe('admin')
  })

  it('updateUser 在无会话时不生效', () => {
    const store = useAuthStore()
    store.updateUser({
      id: 'x',
      username: 'ghost',
      email: 'ghost@example.com',
      role: 'user',
      status: 'active',
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    })
    expect(store.user).toBeNull()
  })

  it('clearSession 清空登录状态', () => {
    const store = useAuthStore()
    store.setSession(makeSession(), true)
    store.clearSession()
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
  })
})
