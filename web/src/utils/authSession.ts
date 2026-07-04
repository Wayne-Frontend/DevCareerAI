import type { AuthSession, AuthUser } from '@/types/auth'

// 旧版曾把含 accessToken 的完整会话写进 storage（XSS 可直接读取窃取），
// 现在 access token 只存内存，storage 仅保留非敏感的用户资料用于刷新页面时的 UI 快速恢复。
const LEGACY_SESSION_KEY = 'devcareer-auth-session'
const AUTH_USER_KEY = 'devcareer-auth-user'
const REFRESH_SKEW_MS = 60 * 1000

// access token 仅存于内存：页面刷新后由 HttpOnly refresh cookie 静默换取新 token
//（router 守卫与 authStore.hydrate 均会触发 refresh），杜绝脚本从存储读取 token 的路径。
let memorySession: AuthSession | null = null

export function getAuthToken() {
  return memorySession?.accessToken || ''
}

export function getMemoryAuthSession(): AuthSession | null {
  return memorySession
}

export function shouldRefreshAuthToken(skewMs = REFRESH_SKEW_MS) {
  if (!memorySession) {
    // 无内存 token 但本地有用户资料：说明刚刷新过页面，需要用 refresh cookie 恢复。
    return Boolean(getStoredAuthUser())
  }

  const expiresAt = new Date(memorySession.accessTokenExpiresAt).getTime()
  return Number.isFinite(expiresAt) && expiresAt <= Date.now() + skewMs
}

export function setStoredAuthSession(session: AuthSession, remember: boolean) {
  memorySession = session
  clearStoredProfile()
  const target = remember ? localStorage : sessionStorage
  target.setItem(AUTH_USER_KEY, JSON.stringify(session.user))
}

// refresh 成功后替换内存会话，用户资料写回原存储位置。
export function applyRefreshedAuthSession(session: AuthSession) {
  memorySession = session
  updateStoredAuthUser(session.user)
}

export function updateStoredAuthUser(user: AuthUser) {
  if (memorySession) {
    memorySession = { ...memorySession, user }
  }

  const target = sessionStorage.getItem(AUTH_USER_KEY) ? sessionStorage : localStorage
  target.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function getStoredAuthUser(): AuthUser | null {
  migrateLegacySessions()

  const user = readUser(localStorage) ?? readUser(sessionStorage)
  return user
}

export function clearStoredAuthSession() {
  memorySession = null
  clearStoredProfile()
}

function clearStoredProfile() {
  localStorage.removeItem(AUTH_USER_KEY)
  sessionStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(LEGACY_SESSION_KEY)
  sessionStorage.removeItem(LEGACY_SESSION_KEY)
}

// 老版本存储的完整会话（含 token）：提取用户资料迁移到新键并删除，token 不再入库。
function migrateLegacySessions() {
  for (const storage of [localStorage, sessionStorage]) {
    const raw = storage.getItem(LEGACY_SESSION_KEY)
    if (!raw) continue

    storage.removeItem(LEGACY_SESSION_KEY)

    try {
      const legacy = JSON.parse(raw) as Partial<AuthSession>
      if (legacy?.user?.id && !storage.getItem(AUTH_USER_KEY)) {
        storage.setItem(AUTH_USER_KEY, JSON.stringify(legacy.user))
      }
    } catch {
      // 脏数据直接丢弃
    }
  }
}

function readUser(storage: Storage): AuthUser | null {
  const raw = storage.getItem(AUTH_USER_KEY)
  if (!raw) return null

  try {
    const user = JSON.parse(raw) as AuthUser
    if (!user?.id) {
      storage.removeItem(AUTH_USER_KEY)
      return null
    }
    return user
  } catch {
    storage.removeItem(AUTH_USER_KEY)
    return null
  }
}
