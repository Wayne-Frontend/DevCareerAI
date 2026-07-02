import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthSession, AuthUser } from '../types/auth'
import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession, updateStoredAuthUser } from '../utils/authSession'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(getStoredAuthSession())

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

  return {
    session,
    user,
    token,
    isAuthenticated,
    isAdmin,
    setSession,
    clearSession,
    updateUser,
  }
})
