import { ServiceUnavailableException } from '@nestjs/common'
import type { AiUsage } from './ai.types'

/**
 * 流式调用中断（客户端断连 / 网络错误）时抛出，携带中断前已产生的部分内容与用量。
 * AI 服务对已生成的 token 照常计费，AiService 捕获后据此落一条估算用量，避免成本统计缺口。
 */
export class AiStreamInterruptedError extends ServiceUnavailableException {
  constructor(
    readonly model: string,
    readonly partialText: string,
    readonly usage: AiUsage | undefined,
    message: string,
  ) {
    super(message)
  }
}
