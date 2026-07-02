import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosError } from 'axios'
import type { Readable } from 'stream'
import { isConfiguredApiKey, resolveAiConfig, type ResolvedAiConfig } from '../ai-config'
import type { AiUsage, ChatOptions, ChatResult, ChatStreamOptions, ChatStreamResult } from '../ai.types'
import type { AiProvider } from './ai-provider.interface'

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  usage?: AiUsage
}

interface ChatCompletionStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string | null
    }
    finish_reason?: string | null
  }>
  usage?: AiUsage | null
}

/**
 * 面向 OpenAI 兼容协议（/chat/completions）的通用 Provider，适配 DeepSeek、OpenAI、
 * Moonshot、本地 vLLM 等。DeepSeek 专有的 thinking 参数由配置开关控制。
 */
@Injectable()
export class OpenAiCompatibleProvider implements AiProvider {
  private readonly config: ResolvedAiConfig

  constructor(configService: ConfigService) {
    this.config = resolveAiConfig((key) => configService.get<string>(key))
  }

  getModel(tier: ChatOptions['modelTier'] = 'quality') {
    return tier === 'fast' ? this.config.modelFast : this.config.modelQuality
  }

  async chat(options: ChatOptions): Promise<ChatResult> {
    this.assertApiKey()
    const model = this.getModel(options.modelTier)

    try {
      const response = await axios.post<ChatCompletionResponse>(this.endpoint(), this.buildBody(options, model, false), {
        headers: this.headers(),
        timeout: 90000,
      })

      return {
        text: response.data.choices?.[0]?.message?.content || '',
        usage: response.data.usage,
        model,
      }
    } catch (error) {
      throw new ServiceUnavailableException(`AI service unavailable: ${readAxiosErrorMessage(error)}`)
    }
  }

  async chatStream(options: ChatStreamOptions): Promise<ChatStreamResult> {
    this.assertApiKey()
    const model = this.getModel(options.modelTier)

    try {
      const response = await axios.post<Readable>(this.endpoint(), this.buildBody(options, model, true), {
        headers: this.headers(),
        responseType: 'stream',
        timeout: 120000,
        signal: options.signal,
      })

      const result = await readChatStream(response.data, options)
      return {
        ...result,
        model,
      }
    } catch (error) {
      if (options.signal?.aborted) {
        throw new ServiceUnavailableException('AI request was cancelled')
      }

      throw new ServiceUnavailableException(`AI service unavailable: ${readAxiosErrorMessage(error)}`)
    }
  }

  private endpoint() {
    return `${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  private assertApiKey() {
    if (!isConfiguredApiKey(this.config.apiKey)) {
      throw new ServiceUnavailableException('AI API Key is not configured')
    }
  }

  private buildBody(options: ChatOptions, model: string, stream: boolean) {
    // messages 数组优先（多轮对话场景）；否则退回到单条 userPrompt 的既有行为。
    const turns = options.messages?.length
      ? options.messages
      : [{ role: 'user' as const, content: options.userPrompt ?? '' }]

    return {
      model,
      messages: [{ role: 'system', content: options.systemPrompt }, ...turns],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2000,
      ...(this.config.sendThinking ? { thinking: { type: options.thinking ?? 'disabled' } } : {}),
      ...(stream ? { stream: true, stream_options: { include_usage: true } } : {}),
      ...(options.responseFormat === 'text'
        ? {}
        : {
            response_format: { type: 'json_object' },
          }),
    }
  }
}

function readChatStream(
  stream: Readable,
  options: ChatStreamOptions,
): Promise<Omit<ChatStreamResult, 'model'>> {
  return new Promise((resolve, reject) => {
    let buffer = ''
    let text = ''
    let usage: AiUsage | undefined

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data:')) continue

        const data = trimmed.replace(/^data:\s*/, '')
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data) as ChatCompletionStreamChunk
          const delta = parsed.choices?.[0]?.delta?.content || ''

          if (delta) {
            text += delta
            options.onDelta?.(delta)
          }

          if (parsed.usage) {
            usage = parsed.usage
            options.onUsage?.(parsed.usage)
          }
        } catch {
          // 忽略不完整/非法的 SSE 分片，继续读取流。
        }
      }
    })

    stream.on('end', () => resolve({ text, usage }))
    stream.on('error', reject)
  })
}

function readAxiosErrorMessage(error: unknown) {
  return error instanceof AxiosError
    ? error.response?.data?.error?.message || error.response?.data?.message || error.message
    : error instanceof Error
      ? error.message
      : 'AI service request failed'
}
