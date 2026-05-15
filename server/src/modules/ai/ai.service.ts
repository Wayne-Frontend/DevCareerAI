import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import type { ChatOptions } from './ai.types'

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  async chat(options: ChatOptions): Promise<string> {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY')
    const baseUrl = this.configService.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com'
    const model = this.configService.get<string>('DEEPSEEK_MODEL') || 'deepseek-v4-flash'

    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new ServiceUnavailableException('AI API Key is not configured')
    }

    const response = await axios.post<DeepSeekChatResponse>(
      `${baseUrl}/chat/completions`,
      {
        model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userPrompt },
        ],
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    )

    return response.data.choices?.[0]?.message?.content || ''
  }
}
