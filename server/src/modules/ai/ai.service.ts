import { Inject, Injectable } from '@nestjs/common'
import { estimateTokens } from '../../common/utils/token-estimate.util'
import { AiStreamInterruptedError } from './ai-errors'
import { AiUsageService } from './ai-usage.service'
import type { AiUsage, ChatOptions, ChatStreamOptions, ChatStreamResult } from './ai.types'
import { AI_PROVIDER, type AiProvider } from './providers/ai-provider.interface'

/**
 * 业务侧统一入口。具体协议由注入的 AiProvider 实现，切换模型只需更换 Provider，
 * 调用方无需改动。所有真实调用的 token 用量在这里统一埋点（缓存命中不会走到这里）；
 * 服务未上报 usage（流式断连等）时按文本长度估算兜底，以 usageSource 区分两种来源。
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
    await this.recordUsage(options, result.model, result.usage, result.text)
    return result.text
  }

  async chatStream(options: ChatStreamOptions): Promise<ChatStreamResult> {
    try {
      const result = await this.provider.chatStream(options)
      await this.recordUsage(options, result.model, result.usage, result.text)
      return result
    } catch (error) {
      // 流中断前已生成的内容照常被 AI 服务计费：按部分结果落一条用量再抛出，避免成本统计缺口。
      if (error instanceof AiStreamInterruptedError) {
        await this.recordUsage(options, error.model, error.usage, error.partialText)
      }
      throw error
    }
  }

  private async recordUsage(
    options: ChatOptions,
    model: string,
    usage: AiUsage | undefined,
    completionText: string,
  ) {
    const hasReportedUsage = Boolean(
      usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens),
    )

    await this.usageService.record({
      feature: options.feature,
      userId: options.userId,
      model,
      usage: hasReportedUsage ? usage : this.estimateUsage(options, completionText),
      usageSource: hasReportedUsage ? 'reported' : 'estimated',
    })
  }

  private estimateUsage(options: ChatOptions, completionText: string): AiUsage {
    const promptText = [
      options.systemPrompt,
      ...(options.messages?.length
        ? options.messages.map((turn) => turn.content)
        : [options.userPrompt ?? '']),
    ].join('\n')

    const promptTokens = estimateTokens(promptText)
    const completionTokens = estimateTokens(completionText)

    return {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    }
  }
}
