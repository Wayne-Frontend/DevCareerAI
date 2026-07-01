export interface ResolvedAiConfig {
  apiKey: string
  baseUrl: string
  modelFast: string
  modelQuality: string
  // 是否发送推理开关参数（如 DeepSeek 的 thinking）。纯 OpenAI 等不识别该字段的服务保持 false。
  sendThinking: boolean
}

export type AiConfigReader = (key: string) => string | undefined

// 示例占位符，用于识别未替换的 .env 值，避免把占位当成真实 key。
export const PLACEHOLDER_API_KEYS = new Set(['your_api_key_here'])

export function isConfiguredApiKey(apiKey: string): boolean {
  return Boolean(apiKey) && !PLACEHOLDER_API_KEYS.has(apiKey)
}

/**
 * 解析 AI 配置。仅读取通用的 AI_* 变量；不内置任何厂商的默认 base URL / 模型，
 * 地址与模型必须显式配置，避免静默指向某一家。
 */
export function resolveAiConfig(read: AiConfigReader): ResolvedAiConfig {
  const get = (key: string) => read(key)?.trim() || ''
  const sendThinkingRaw = read('AI_SEND_THINKING')?.trim().toLowerCase()

  return {
    apiKey: get('AI_API_KEY'),
    baseUrl: get('AI_BASE_URL'),
    modelFast: get('AI_MODEL_FAST'),
    modelQuality: get('AI_MODEL_QUALITY'),
    sendThinking: sendThinkingRaw === 'true' || sendThinkingRaw === '1',
  }
}
