import { computed, ref } from 'vue'
import axios from 'axios'
import { defineStore } from 'pinia'
import { getCurrentUser } from '@/api/auth'
import { refreshAuthSession } from '@/api/authRefresh'
import type { AuthSession, AuthUser } from '@/types/auth'
import {
  clearStoredAuthSession,
  getStoredAuthUser,
  setStoredAuthSession,
  updateStoredAuthUser,
} from '@/utils/authSession'

// 防止 HMR 等场景重复注册全局监听（store setup 理论上只跑一次，这里做双保险）。
let refreshListenerBound = false

export const useAuthStore = defineStore('auth', () => {
  // access token 只存内存（session ref）；storage 仅缓存用户资料，页面刷新后由 refresh cookie 恢复 token。
  const session = ref<AuthSession | null>(null)
  const user = ref<AuthUser | null>(getStoredAuthUser())
  const hydrated = ref(false)

  const token = computed(() => session.value?.accessToken || '')
  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => user.value?.role === 'admin')

  function setSession(nextSession: AuthSession, remember: boolean) {
    session.value = nextSession
    user.value = nextSession.user
    setStoredAuthSession(nextSession, remember)
  }

  function clearSession() {
    session.value = null
    user.value = null
    clearStoredAuthSession()
  }

  function updateUser(nextUser: AuthUser) {
    // 未登录（无会话也无缓存资料）时不生效，避免登出后误写资料缓存。
    if (!session.value && !user.value) return

    user.value = nextUser
    if (session.value) {
      session.value = { ...session.value, user: nextUser }
    }
    updateStoredAuthUser(nextUser)
  }

  // 应用启动：本地有用户资料但内存无 token 时，先用 refresh cookie 静默恢复，
  // 再以服务端为准同步一次用户资料；cookie 已失效则清理本地缓存，由路由守卫带去登录页。
  async function hydrate() {
    if (hydrated.value) return

    try {
      if (user.value && !session.value) {
        await refreshAuthSession()
      }
      if (session.value) {
        const nextUser = await getCurrentUser()
        updateUser(nextUser)
      }
    } catch (error) {
      // 有 HTTP 响应（401/403 等）才视为会话失效；网络/服务暂时不可用时保留本地缓存资料，
      // 后端恢复后 refresh cookie 仍可在下次加载时静默恢复登录。
      if (axios.isAxiosError(error) && error.response) {
        clearSession()
      }
    } finally {
      hydrated.value = true
    }
  }

  if (typeof window !== 'undefined' && !refreshListenerBound) {
    refreshListenerBound = true
    window.addEventListener('auth-session-refreshed', (event) => {
      const nextSession = (event as CustomEvent<AuthSession>).detail
      if (nextSession?.accessToken) {
        session.value = nextSession
        user.value = nextSession.user
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
