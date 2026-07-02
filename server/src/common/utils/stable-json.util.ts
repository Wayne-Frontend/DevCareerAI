/**
 * 与顺序无关的 JSON 序列化：对象键排序后再序列化，使内容相同、键顺序不同的两个值得到相同字符串。
 * 用于判断两条分析记录的 resultJson 是否内容一致（缓存命中时复用已有记录、避免写入重复行）。
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null'
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const objectValue = value as Record<string, unknown>
  return `{${Object.keys(objectValue)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`)
    .join(',')}}`
}
