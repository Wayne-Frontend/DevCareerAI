import { describe, expect, it } from 'vitest'
import type { ResumeRecord } from '../src/types/resume'
import { buildResumeMarkdown, sanitizeFileName } from '../src/utils/resumeExport'

function makeResume(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  return {
    id: 'r1',
    title: '前端开发工程师简历',
    content: '## 工作经历\n负责 A 项目',
    targetRole: '前端开发工程师',
    experienceLevel: '3-5',
    ...overrides,
  }
}

describe('sanitizeFileName', () => {
  it('去掉非法文件名字符', () => {
    expect(sanitizeFileName('前端/后端:简历*?')).toBe('前端 后端 简历')
  })

  it('空标题或纯非法字符回退为“简历”', () => {
    expect(sanitizeFileName('')).toBe('简历')
    expect(sanitizeFileName('  ...  ')).toBe('简历')
  })
})

describe('buildResumeMarkdown', () => {
  it('组装标题、元信息行与正文', () => {
    const md = buildResumeMarkdown(makeResume())
    expect(md).toContain('# 前端开发工程师简历')
    expect(md).toContain('目标岗位：前端开发工程师')
    // 经验档位转成人类可读文案
    expect(md).toContain('经验年限：3-5 年')
    expect(md).toContain('---')
    expect(md).toContain('负责 A 项目')
  })

  it('缺省元信息时不输出对应字段', () => {
    const md = buildResumeMarkdown(makeResume({ targetRole: '', experienceLevel: '' }))
    expect(md).not.toContain('目标岗位')
    expect(md).not.toContain('经验年限')
  })

  it('标题为空时回退为占位标题', () => {
    const md = buildResumeMarkdown(makeResume({ title: '' }))
    expect(md).toContain('# 未命名简历')
  })
})
