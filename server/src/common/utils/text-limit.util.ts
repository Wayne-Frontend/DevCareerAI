export const MAX_PARSED_TEXT_LENGTH = 30000

export function limitText(text: string, maxLength = MAX_PARSED_TEXT_LENGTH) {
  if (text.length <= maxLength) {
    return {
      text,
      truncated: false,
    }
  }

  return {
    text: text.slice(0, maxLength),
    truncated: true,
  }
}
