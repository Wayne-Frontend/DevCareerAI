import { Inject, Injectable } from '@nestjs/common'
import { AiUsageService } from './ai-usage.service'
import type { ChatOptions, ChatStreamOptions, ChatStreamResult } from './ai.types'
import { AI_PROVIDER, type AiProvider } from './providers/ai-provider.interface'

/**
 * 业务侧统一入口。具体协议由注入的 AiProvider 实现，切换模型只需更换 Provider，
 * 调用方无需改动。所有真实调用的 token 用量在这里统一埋点（缓存命中不会走到这里）。
 */
@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly usageService: AiUsageService,
  ) {}

  getModel(tier: ChatOptions['modelTier'] = 'quality') {
    return this.provider.getModel(tier)
  }

  async chat(options: ChatOptions): Promise<string> {
    const result = await this.provider.chat(options)
    await this.usageService.record({
      feature: options.feature,
      userId: options.userId,
      model: result.model,
      usage: result.usage,
    })
    return result.text
  }

  async chatStream(options: ChatStreamOptions): Promise<ChatStreamResult> {
    const result = await this.provider.chatStream(options)
    await this.usageService.record({
      feature: options.feature,
      userId: options.userId,
      model: result.model,
      usage: result.usage,
    })
    return result
  }
}
