import type { AuthSession, AuthUser } from '@/types/auth'

const AUTH_SESSION_KEY = 'devcareer-auth-session'
const REFRESH_SKEW_MS = 60 * 1000

export function getStoredAuthSession(): AuthSession | null {
  const session = readSession(localStorage) || readSession(sessionStorage)

  if (!session || !isValidSessionShape(session)) {
    clearStoredAuthSession()
    return null
  }

  return session
}

export function getAuthToken() {
  return getStoredAuthSession()?.accessToken || ''
}

export function shouldRefreshAuthToken(skewMs = REFRESH_SKEW_MS) {
  const session = getStoredAuthSession()
  if (!session) return false

  const expiresAt = new Date(session.accessTokenExpiresAt).getTime()
  return Number.isFinite(expiresAt) && expiresAt <= Date.now() + skewMs
}

export function setStoredAuthSession(session: AuthSession, remember: boolean) {
  clearStoredAuthSession()
  const target = remember ? localStorage : sessionStorage
  target.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function replaceStoredAuthSession(session: AuthSession) {
  const target = readSession(localStorage) ? localStorage : sessionStorage
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

function isValidSessionShape(session: AuthSession) {
  return (
    typeof session.accessToken === 'string' &&
    session.accessToken.length > 0 &&
    typeof session.accessTokenExpiresAt === 'string' &&
    Boolean(session.user?.id)
  )
}
