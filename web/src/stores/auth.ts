import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentUser } from '@/api/auth'
import type { AuthSession, AuthUser } from '@/types/auth'
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
  updateStoredAuthUser,
} from '@/utils/authSession'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(getStoredAuthSession())
  const hydrated = ref(false)

  const user = computed(() => session.value?.user || null)
  const token = computed(() => session.value?.accessToken || '')
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
    const storedSession = getStoredAuthSession()
    if (!session.value && !storedSession) return

    session.value = {
      ...(storedSession || session.value!),
      user: nextUser,
    }
    updateStoredAuthUser(nextUser)
  }

  // 应用启动时以服务端为准校验一次本地会话；若 access token 过期，request 拦截器会先尝试 refresh。
  async function hydrate() {
    if (hydrated.value || !session.value) {
      hydrated.value = true
      return
    }

    try {
      const nextUser = await getCurrentUser()
      updateUser(nextUser)
    } catch {
      // 401 已由响应拦截器处理；其余错误静默忽略，维持当前会话。
    } finally {
      hydrated.value = true
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('auth-session-refreshed', (event) => {
      const nextSession = (event as CustomEvent<AuthSession>).detail
      if (nextSession?.accessToken) {
        session.value = nextSession
      }
    })
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
