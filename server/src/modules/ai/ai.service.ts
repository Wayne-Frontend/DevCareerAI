import { Inject, Injectable } from '@nestjs/common'
import type { ChatOptions, ChatStreamOptions, ChatStreamResult } from './ai.types'
import { AI_PROVIDER, type AiProvider } from './providers/ai-provider.interface'

/**
 * 业务侧统一入口。具体协议由注入的 AiProvider 实现，切换模型只需更换 Provider，
 * 调用方无需改动。
 */
@Injectable()
export class AiService {
  constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

  getModel(tier: ChatOptions['modelTier'] = 'quality') {
    return this.provider.getModel(tier)
  }

  chat(options: ChatOptions): Promise<string> {
    return this.provider.chat(options)
  }

  chatStream(options: ChatStreamOptions): Promise<ChatStreamResult> {
    return this.provider.chatStream(options)
  }
}
