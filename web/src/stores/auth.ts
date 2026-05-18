import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthSession } from '../types/auth'
import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession } from '../utils/authSession'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(getStoredAuthSession())

  const user = computed(() => session.value?.user || null)
  const token = computed(() => session.value?.token || '')
  const isAuthenticated = computed(() => Boolean(token.value))

  function setSession(nextSession: AuthSession, remember: boolean) {
    session.value = nextSession
    setStoredAuthSession(nextSession, remember)
  }

  function clearSession() {
    session.value = null
    clearStoredAuthSession()
  }

  return {
    session,
    user,
    token,
    isAuthenticated,
    setSession,
    clearSession,
  }
})
