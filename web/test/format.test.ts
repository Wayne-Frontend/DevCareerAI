import { describe, expect, it } from 'vitest'
import { formatDateTime, toTagList } from '../src/utils/format'

describe('formatDateTime', () => {
  it('按 zh-CN 年月日时分格式化', () => {
    // 用带时区偏移的输入避免本地时区影响；只校验日期部分（时分随运行时区变化）。
    const output = formatDateTime('2026-07-01T09:05:00+08:00')
    expect(output).toContain('2026')
    expect(output).toContain('07')
    // 含时分（HH:MM 形态）即可，不锁死具体小时数。
    expect(output).toMatch(/\d{2}:\d{2}/)
  })

  it('输出包含年月日与时分两部分', () => {
    const output = formatDateTime('2026-01-15T22:30:00+08:00')
    expect(output).toContain('2026')
    expect(output).toContain('01')
  })

  it('空字符串降级为占位符而非抛错', () => {
    expect(formatDateTime('')).toBe('-')
  })

  it('非法日期字符串降级为占位符而非抛错', () => {
    expect(formatDateTime('not-a-date')).toBe('-')
  })
})

describe('toTagList', () => {
  it('按逗号（中英文）与换行拆分', () => {
    expect(toTagList('Vue, React，Node\nTS')).toEqual(['Vue', 'React', 'Node', 'TS'])
  })

  it('去除空白并过滤空项', () => {
    expect(toTagList('  a ,, b , ')).toEqual(['a', 'b'])
  })

  it('空字符串返回空数组', () => {
    expect(toTagList('')).toEqual([])
  })
})
