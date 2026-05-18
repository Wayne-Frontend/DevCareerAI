const PLACEHOLDER_API_KEYS = new Set(['', 'your_api_key_here'])

export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = []
  const databaseUrl = readString(config.DATABASE_URL)
  const apiKey = readString(config.DEEPSEEK_API_KEY)
  const baseUrl = readString(config.DEEPSEEK_BASE_URL) || 'https://api.deepseek.com'
  const fastModel = readString(config.DEEPSEEK_MODEL_FAST)
  const qualityModel = readString(config.DEEPSEEK_MODEL_QUALITY)
  const legacyModel = readString(config.DEEPSEEK_MODEL)
  const port = readString(config.PORT)

  if (!databaseUrl) {
    errors.push('DATABASE_URL is required')
  }

  if (PLACEHOLDER_API_KEYS.has(apiKey)) {
    errors.push('DEEPSEEK_API_KEY is required and must not use the example placeholder')
  }

  if (!isHttpUrl(baseUrl)) {
    errors.push('DEEPSEEK_BASE_URL must be a valid http(s) URL')
  }

  if (!fastModel && !legacyModel) {
    errors.push('DEEPSEEK_MODEL_FAST or DEEPSEEK_MODEL is required')
  }

  if (!qualityModel && !legacyModel) {
    errors.push('DEEPSEEK_MODEL_QUALITY or DEEPSEEK_MODEL is required')
  }

  if (port && (!Number.isInteger(Number(port)) || Number(port) <= 0 || Number(port) > 65535)) {
    errors.push('PORT must be an integer between 1 and 65535')
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.map((item) => `- ${item}`).join('\n')}`)
  }

  return config
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
