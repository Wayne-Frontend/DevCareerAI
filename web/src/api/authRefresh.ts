import axios from 'axios'
import type { AuthSession } from '@/types/auth'
import {
  applyRefreshedAuthSession,
  getAuthToken,
  shouldRefreshAuthToken,
} from '@/utils/authSession'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

let refreshPromise: Promise<AuthSession> | null = null

export async function ensureFreshAccessToken(force = false) {
  if (!force && !shouldRefreshAuthToken()) {
    return getAuthToken()
  }

  const session = await refreshAuthSession()
  return session.accessToken
}

export function refreshAuthSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<AuthSession>(`${API_BASE_URL}/auth/refresh`, undefined, { withCredentials: true })
      .then((response) => {
        applyRefreshedAuthSession(response.data)
        window.dispatchEvent(new CustomEvent('auth-session-refreshed', { detail: response.data }))
        return response.data
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}
