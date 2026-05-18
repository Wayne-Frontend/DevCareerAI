import type { AuthSession, AuthUser } from '../types/auth'

const AUTH_SESSION_KEY = 'devcareer-auth-session'

export function getStoredAuthSession(): AuthSession | null {
  const session = readSession(localStorage) || readSession(sessionStorage)

  if (!session) return null

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    clearStoredAuthSession()
    return null
  }

  return session
}

export function getAuthToken() {
  return getStoredAuthSession()?.token || ''
}

export function setStoredAuthSession(session: AuthSession, remember: boolean) {
  clearStoredAuthSession()
  const target = remember ? localStorage : sessionStorage
  target.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function updateStoredAuthUser(user: AuthUser) {
  const localSession = readSession(localStorage)

  if (localSession) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ ...localSession, user }))
    return
  }

  const sessionSession = readSession(sessionStorage)

  if (sessionSession) {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ ...sessionSession, user }))
  }
}

export function clearStoredAuthSession() {
  localStorage.removeItem(AUTH_SESSION_KEY)
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}

function readSession(storage: Storage): AuthSession | null {
  const raw = storage.getItem(AUTH_SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    storage.removeItem(AUTH_SESSION_KEY)
    return null
  }
}
