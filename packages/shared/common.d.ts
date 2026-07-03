// AI 类接口通用的响应元信息：是否命中缓存、AI 返回是否为合法 JSON。
export interface AiResponseMeta {
  cached?: boolean
  status: 'success' | 'parse_error'
}
