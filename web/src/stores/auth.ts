import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentUser } from '../api/auth'
import type { AuthSession, AuthUser } from '../types/auth'
import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession, updateStoredAuthUser } from '../utils/authSession'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(getStoredAuthSession())
  const hydrated = ref(false)

  const user = computed(() => session.value?.user || null)
  const token = computed(() => session.value?.token || '')
  const isAuthenticated = computed(() => Boolean(token.value))
  const isAdmin = computed(() => user.value?.role === 'admin')

  function setSession(nextSession: AuthSession, remember: boolean) {
    session.value = nextSession
    setStoredAuthSession(nextSession, remember)
  }

  function clearSession() {
    session.value = null
    clearStoredAuthSession()
  }

  function updateUser(nextUser: AuthUser) {
    if (!session.value) return

    session.value = {
      ...session.value,
      user: nextUser,
    }
    updateStoredAuthUser(nextUser)
  }

  // 应用启动时以服务端为准校验一次本地缓存的会话：
  // - 有效 → 用最新 user 覆盖本地缓存（刷新头像/角色等）
  // - 401（已失效/被吊销）→ 由 request 拦截器统一 clearSession 并跳登录
  // - 其它错误（网络抖动/5xx）→ 保留乐观会话，不误踢用户
  async function hydrate() {
    if (hydrated.value || !session.value) {
      hydrated.value = true
      return
    }

    try {
      const nextUser = await getCurrentUser()
      updateUser(nextUser)
    } catch {
      // 401 已由响应拦截器处理；其余错误静默忽略，维持当前会话
    } finally {
      hydrated.value = true
    }
  }

  return {
    session,
    user,
    token,
    isAuthenticated,
    isAdmin,
    hydrated,
    setSession,
    clearSession,
    updateUser,
    hydrate,
  }
})
