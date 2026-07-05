import { equal } from 'node:assert/strict'
import { test } from 'vitest'
import { isConfiguredApiKey, resolveAiConfig } from '../src/modules/ai/ai-config'

function reader(env: Record<string, string | undefined>) {
  return (key: string) => env[key]
}

test('解析 AI_* 变量', () => {
  const config = resolveAiConfig(
    reader({
      AI_API_KEY: 'ai-key',
      AI_BASE_URL: 'https://api.openai.com/v1',
      AI_MODEL_FAST: 'gpt-4o-mini',
      AI_MODEL_QUALITY: 'gpt-4o',
    }),
  )
  equal(config.apiKey, 'ai-key')
  equal(config.baseUrl, 'https://api.openai.com/v1')
  equal(config.modelFast, 'gpt-4o-mini')
  equal(config.modelQuality, 'gpt-4o')
})

test('DEEPSEEK_* 不再被读取', () => {
  const config = resolveAiConfig(
    reader({
      DEEPSEEK_API_KEY: 'ds-key',
      DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    }),
  )
  equal(config.apiKey, '')
  equal(config.baseUrl, '')
  equal(config.modelFast, '')
  equal(config.modelQuality, '')
})

test('不内置默认地址或模型', () => {
  const config = resolveAiConfig(reader({ AI_API_KEY: 'k' }))
  equal(config.baseUrl, '')
  equal(config.modelFast, '')
  equal(config.modelQuality, '')
})

test('sendThinking 默认 false，仅显式开启为 true', () => {
  equal(resolveAiConfig(reader({})).sendThinking, false)
  equal(resolveAiConfig(reader({ AI_SEND_THINKING: 'true' })).sendThinking, true)
  equal(resolveAiConfig(reader({ AI_SEND_THINKING: '1' })).sendThinking, true)
  equal(resolveAiConfig(reader({ AI_SEND_THINKING: 'false' })).sendThinking, false)
})

test('isConfiguredApiKey 拒绝空值与占位符', () => {
  equal(isConfiguredApiKey(''), false)
  equal(isConfiguredApiKey('your_api_key_here'), false)
  equal(isConfiguredApiKey('sk-real'), true)
})
