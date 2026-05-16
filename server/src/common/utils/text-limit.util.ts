export const MAX_PARSED_TEXT_LENGTH = 30000
export const AI_TEXT_LIMITS = {
  resume: 12000,
  jobDescription: 10000,
  project: 8000,
  answer: 4000,
  transcript: 12000,
} as const

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

export function limitTextForAi(text: string, maxLength: number) {
  const limited = limitText(text, maxLength)

  if (!limited.truncated) {
    return limited.text
  }

  return `${limited.text}\n\n[System note: the original text is longer than ${maxLength} characters and has been truncated for this AI request. Keep suggestions grounded in the visible content.]`
}
