// AI 类接口通用的响应元信息：是否命中缓存、AI 返回是否为合法 JSON、是否发生过解析失败自动重试。
export interface AiResponseMeta {
  cached?: boolean
  status: 'success' | 'parse_error'
  retried?: boolean
}
