import type { ChatOptions, ChatResult, ChatStreamOptions, ChatStreamResult } from '../ai.types'

export const AI_PROVIDER = Symbol('AI_PROVIDER')

/**
 * AI 服务提供方抽象。新增一种模型只需实现该接口并在 AiModule 中注入，
 * 业务侧（通过 AiService）调用方式保持不变。
 */
export interface AiProvider {
  getModel(tier?: ChatOptions['modelTier']): string
  chat(options: ChatOptions): Promise<ChatResult>
  chatStream(options: ChatStreamOptions): Promise<ChatStreamResult>
}
