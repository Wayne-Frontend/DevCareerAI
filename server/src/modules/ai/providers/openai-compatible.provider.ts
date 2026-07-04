import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosError } from 'axios'
import type { Readable } from 'stream'
import { StringDecoder } from 'string_decoder'
import { AiStreamInterruptedError } from '../ai-errors'
import { isConfiguredApiKey, resolveAiConfig, type ResolvedAiConfig } from '../ai-config'
import type {
  AiUsage,
  ChatOptions,
  ChatResult,
  ChatStreamOptions,
  ChatStreamResult,
} from '../ai.types'
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
      const response = await axios.post<ChatCompletionResponse>(
        this.endpoint(),
        this.buildBody(options, model, false),
        {
          headers: this.headers(),
          timeout: 90000,
        },
      )

      return {
        text: response.data.choices?.[0]?.message?.content || '',
        usage: response.data.usage,
        model,
      }
    } catch (error) {
      throw new ServiceUnavailableException(
        `AI service unavailable: ${readAxiosErrorMessage(error)}`,
      )
    }
  }

  async chatStream(options: ChatStreamOptions): Promise<ChatStreamResult> {
    this.assertApiKey()
    const model = this.getModel(options.modelTier)

    try {
      const response = await axios.post<Readable>(
        this.endpoint(),
        this.buildBody(options, model, true),
        {
          headers: this.headers(),
          responseType: 'stream',
          timeout: 120000,
          signal: options.signal,
        },
      )

      const result = await readChatStream(response.data, options)
      return {
        ...result,
        model,
      }
    } catch (error) {
      // 流读取中断（断连/abort）时已产生的部分内容照常计费，抛出携带部分结果的错误供上层估算用量。
      if (error instanceof StreamReadError) {
        throw new AiStreamInterruptedError(
          model,
          error.partialText,
          error.usage,
          options.signal?.aborted
            ? 'AI request was cancelled'
            : `AI service unavailable: ${readAxiosErrorMessage(error.cause)}`,
        )
      }

      if (options.signal?.aborted) {
        throw new AiStreamInterruptedError(model, '', undefined, 'AI request was cancelled')
      }

      throw new ServiceUnavailableException(
        `AI service unavailable: ${readAxiosErrorMessage(error)}`,
      )
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

// 导出以便单测直接用内存流覆盖 SSE 分片解析、usage 提取与中断路径。
export function readChatStream(
  stream: Readable,
  options: ChatStreamOptions,
): Promise<Omit<ChatStreamResult, 'model'>> {
  return new Promise((resolve, reject) => {
    let buffer = ''
    let text = ''
    let usage: AiUsage | undefined
    // TCP 分片可能切在 UTF-8 多字节字符（如中文 3 字节）中间，直接 toString 会在两端产出 U+FFFD 乱码
    // 并进入流式预览与落库结果。StringDecoder 会暂存不完整的尾部字节，跨 chunk 拼出完整字符。
    const decoder = new StringDecoder('utf8')

    stream.on('data', (chunk: Buffer) => {
      buffer += decoder.write(chunk)
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
    // 读取中途出错（含 abort 触发的 stream destroy）：携带已收到的部分内容拒绝，供上层记录已产生的消耗。
    stream.on('error', (cause) => reject(new StreamReadError(text, usage, cause)))
  })
}

// provider 内部错误：流式读取中断时暂存部分结果，由 chatStream 的 catch 转换为 AiStreamInterruptedError。
export class StreamReadError extends Error {
  constructor(
    readonly partialText: string,
    readonly usage: AiUsage | undefined,
    readonly cause: unknown,
  ) {
    super('AI stream read interrupted')
  }
}

function readAxiosErrorMessage(error: unknown) {
  return error instanceof AxiosError
    ? error.response?.data?.error?.message || error.response?.data?.message || error.message
    : error instanceof Error
      ? error.message
      : 'AI service request failed'
}
