import { isConfiguredApiKey } from '../modules/ai/ai-config'

export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = []
  const databaseUrl = readString(config.DATABASE_URL)
  const apiKey = readString(config.AI_API_KEY)
  const baseUrl = readString(config.AI_BASE_URL)
  const fastModel = readString(config.AI_MODEL_FAST)
  const qualityModel = readString(config.AI_MODEL_QUALITY)
  const port = readString(config.PORT)

  if (!databaseUrl) {
    errors.push('DATABASE_URL is required')
  }

  if (!isConfiguredApiKey(apiKey)) {
    errors.push('AI_API_KEY is required and must not be the example placeholder')
  }

  if (!baseUrl) {
    errors.push('AI_BASE_URL is required')
  } else if (!isHttpUrl(baseUrl)) {
    errors.push('AI_BASE_URL must be a valid http(s) URL')
  }

  if (!fastModel) {
    errors.push('AI_MODEL_FAST is required')
  }

  if (!qualityModel) {
    errors.push('AI_MODEL_QUALITY is required')
  }

  if (port && (!Number.isInteger(Number(port)) || Number(port) <= 0 || Number(port) > 65535)) {
    errors.push('PORT must be an integer between 1 and 65535')
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors.map((item) => `- ${item}`).join('\n')}`,
    )
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
