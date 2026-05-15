export function cleanJsonResponse(text: string): string {
  return text.replace(/```json/g, '').replace(/```/g, '').trim()
}

export function safeParseJson<T>(text: string): T | { rawText: string; parseError: true } {
  const cleaned = cleanJsonResponse(text)

  try {
    return JSON.parse(cleaned) as T
  } catch {
    return {
      rawText: text,
      parseError: true,
    }
  }
}
