import router from '../router'
import { useAuthStore } from '../stores/auth'

// 并发的多个请求可能同时返回 401，用一个开关避免连环 replace / 跳转循环。
let redirecting = false

/**
 * 会话失效（401）时的统一处理：清空内存 + 存储中的会话，并以 SPA 路由方式跳转到登录页，
 * 同时带上当前路径作为 redirect，登录成功后可回到原页面。整页 window.location 跳转会刷新
 * 整个应用（白屏、重下 bundle、丢失 redirect），因此改用 router.replace。
 */
export function redirectToLogin() {
  const current = router.currentRoute.value

  // 已在登录页或已有跳转在途 → 跳过。
  if (current.name === 'login' || redirecting) return

  redirecting = true

  try {
    useAuthStore().clearSession()
  } catch {
    // pinia 尚未就绪等极端情况的兜底，clearSession 失败不应阻断跳转。
  }

  const redirect = current.fullPath && current.fullPath !== '/' ? current.fullPath : undefined

  void router.replace({ name: 'login', query: redirect ? { redirect } : {} }).finally(() => {
    redirecting = false
  })
}
