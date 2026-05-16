import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosError } from 'axios'
import type { Readable } from 'stream'
import type { AiUsage, ChatOptions, ChatStreamOptions, ChatStreamResult } from './ai.types'

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  usage?: AiUsage
}

interface DeepSeekStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string | null
      reasoning_content?: string | null
    }
    finish_reason?: string | null
  }>
  usage?: AiUsage | null
}

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  getModel(modelTier: ChatOptions['modelTier'] = 'quality') {
    if (modelTier === 'fast') {
      return (
        this.configService.get<string>('DEEPSEEK_MODEL_FAST') ||
        this.configService.get<string>('DEEPSEEK_MODEL') ||
        'deepseek-v4-flash'
      )
    }

    return (
      this.configService.get<string>('DEEPSEEK_MODEL_QUALITY') ||
      this.configService.get<string>('DEEPSEEK_MODEL') ||
      'deepseek-v4-pro'
    )
  }

  async chat(options: ChatOptions): Promise<string> {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY')
    const baseUrl = this.configService.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com'
    const model = this.getModel(options.modelTier)

    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new ServiceUnavailableException('AI API Key is not configured')
    }

    try {
      const response = await axios.post<DeepSeekChatResponse>(
        `${baseUrl.replace(/\/$/, '')}/chat/completions`,
        {
          model,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt },
          ],
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 2000,
          thinking: { type: options.thinking ?? 'disabled' },
          ...(options.responseFormat === 'text'
            ? {}
            : {
                response_format: { type: 'json_object' },
              }),
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000,
        },
      )

      return response.data.choices?.[0]?.message?.content || ''
    } catch (error) {
      throw new ServiceUnavailableException(`AI service unavailable: ${readAxiosErrorMessage(error)}`)
    }
  }

  async chatStream(options: ChatStreamOptions): Promise<ChatStreamResult> {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY')
    const baseUrl = this.configService.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com'
    const model = this.getModel(options.modelTier)

    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new ServiceUnavailableException('AI API Key is not configured')
    }

    try {
      const response = await axios.post<Readable>(
        `${baseUrl.replace(/\/$/, '')}/chat/completions`,
        {
          model,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt },
          ],
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 2000,
          thinking: { type: options.thinking ?? 'disabled' },
          stream: true,
          stream_options: { include_usage: true },
          ...(options.responseFormat === 'text'
            ? {}
            : {
                response_format: { type: 'json_object' },
              }),
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 120000,
          signal: options.signal,
        },
      )

      const result = await readDeepSeekStream(response.data, options)
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
}

function readDeepSeekStream(stream: Readable, options: ChatStreamOptions): Promise<Omit<ChatStreamResult, 'model'>> {
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
          const parsed = JSON.parse(data) as DeepSeekStreamChunk
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
          // Ignore malformed SSE fragments and keep reading the stream.
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
