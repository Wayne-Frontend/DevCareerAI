// CJK 统一表意文字 + 日文假名 + 韩文音节：这些字符的 token 密度与拉丁文本差异大，需分开估算。
const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/g

/**
 * 按文本长度粗估 token 数，用于流式断连等 usage 丢失场景的用量兜底记录。
 * 经验系数：中文约 0.6 token/字（DeepSeek/OpenAI 实测量级），其他字符约 4 字符/token。
 * 只求量级正确（误差 ±20% 可接受），估算值会以 usageSource='estimated' 标记，与上报值区分。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0

  const cjkCount = text.match(CJK_REGEX)?.length ?? 0
  const otherCount = text.length - cjkCount

  return Math.ceil(cjkCount * 0.6 + otherCount / 4)
}
