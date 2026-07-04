// AI 结构化输出的重试辅助：第一次生成解析失败（parse_error）时由 AiCacheService.resolve
// 自动重试一次，重试载荷在此统一调整。
export interface AiGenerationAttempt {
  retry: boolean
}

const STRICT_JSON_INSTRUCTION =
  '【格式要求】你上一次的输出不是合法 JSON。本次必须只输出一个合法的 JSON 对象：' +
  '不要输出 Markdown 代码块、不要输出任何解释文字、确保输出完整不被截断。'

/**
 * 重试时的载荷调整：
 * 1. maxTokens 上调 50% —— 解析失败最常见的原因是输出被 max_tokens 截断导致 JSON 不完整；
 * 2. 追加严格 JSON 指令 —— 覆盖模型输出多余文本/代码块包裹的情况。
 * 两者都无害，重试时无条件同时应用，省去 finish_reason 的全链路透传。
 */
export function applyStrictJsonRetry<P extends { userPrompt: string; maxTokens: number }>(
  payload: P,
  attempt: AiGenerationAttempt,
): P {
  if (!attempt.retry) return payload

  return {
    ...payload,
    maxTokens: Math.ceil(payload.maxTokens * 1.5),
    userPrompt: `${payload.userPrompt}\n\n${STRICT_JSON_INSTRUCTION}`,
  }
}
