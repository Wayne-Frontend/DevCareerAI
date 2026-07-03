// 服务端上传类资源（头像等）自 2026-07 起只存相对路径（/uploads/...），
// 由前端按 API 地址拼出完整 URL；存量数据可能仍是绝对 URL，原样返回兼容。
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

// 去掉末尾的 /api 前缀得到后端 origin：
// - 生产（完整地址）：https://api.example.com/api -> https://api.example.com
// - 开发（同源代理）：/api -> ''，相对路径直接交给 vite 的 /uploads 代理
const ASSET_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

export function resolveAssetUrl(url: string | null | undefined) {
  const value = url?.trim()
  if (!value) return ''
  if (/^https?:\/\//.test(value)) return value

  return `${ASSET_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`
}
