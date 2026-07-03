/**
 * 基于文件头魔数（magic number）校验文件真实类型，作为扩展名 / 客户端 mimetype 之外
 * 的第二道关。扩展名和 Content-Type 均由客户端提供、可伪造，不能单独作为信任依据。
 */

export type DocumentExtension = 'pdf' | 'docx' | 'txt' | 'md'
export type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

// PDF：%PDF
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]
// ZIP 容器（docx/xlsx/pptx 本质都是 zip）：PK\x03\x04 常规、PK\x05\x06 空档、PK\x07\x08 跨卷
const ZIP_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
]

function startsWith(buffer: Buffer, signature: number[], offset = 0): boolean {
  if (buffer.length < offset + signature.length) return false

  for (let i = 0; i < signature.length; i += 1) {
    if (buffer[offset + i] !== signature[i]) return false
  }

  return true
}

/**
 * 文本启发式：txt/md 没有固定魔数，只能反向排除二进制。
 * 出现 NUL 字节直接判为二进制；不可打印控制字符（排除 \t \n \r）占比过高也判为非文本。
 */
export function looksLikeText(buffer: Buffer, sampleSize = 4096): boolean {
  const length = Math.min(buffer.length, sampleSize)
  if (length === 0) return true // 空文件交给上层长度校验处理

  let suspicious = 0
  for (let i = 0; i < length; i += 1) {
    const byte = buffer[i]
    if (byte === 0) return false // NUL 是二进制的强信号
    if (byte < 9 || (byte > 13 && byte < 32)) suspicious += 1
  }

  return suspicious / length < 0.1
}

/**
 * 校验文档内容是否与扩展名相符。pdf/docx 用魔数，txt/md 用文本启发式。
 */
export function matchesDocumentSignature(buffer: Buffer, extension: DocumentExtension): boolean {
  if (extension === 'pdf') return startsWith(buffer, PDF_SIGNATURE)
  if (extension === 'docx') return ZIP_SIGNATURES.some((signature) => startsWith(buffer, signature))
  return looksLikeText(buffer)
}

/**
 * 按魔数识别图片真实类型，返回规范化 mime；无法识别返回 null。
 * 存盘扩展名应以此为准，而非客户端上报的 Content-Type。
 */
export function detectImageMime(buffer: Buffer): ImageMimeType | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return 'image/gif'
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp'
  }

  return null
}
