export type ParsedAiResult<T> = T | { rawText: string; parseError: true }

export function getAiResultStatus<T>(value: ParsedAiResult<T>) {
  return isParseError(value) ? 'parse_error' : 'success'
}

export function isParseError<T>(value: ParsedAiResult<T>): value is { rawText: string; parseError: true } {
  return typeof value === 'object' && value !== null && 'parseError' in value
}
