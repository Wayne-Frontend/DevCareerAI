import { deepEqual, equal } from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeJobMatchResult } from '../src/modules/job/job.service'
import { normalizeFeedbackResult, normalizeSummaryResult } from '../src/modules/interview/interview.service'
import { normalizeProjectResult } from '../src/modules/project/project.service'
import { normalizeResumeAnalysisResult } from '../src/modules/resume/resume.service'

test('简历诊断 parse_error 保留原文并降级', () => {
  const result = normalizeResumeAnalysisResult({ rawText: '原始文本', parseError: true })
  equal(result.score, 0)
  equal(result.summary, '原始文本')
  deepEqual(result.weaknesses, ['AI 返回内容不是合法 JSON，已保留原文。'])
})

test('简历诊断分数 clamp 到 0-100 并过滤空值', () => {
  const result = normalizeResumeAnalysisResult({
    score: 250,
    summary: '',
    dimensionScores: {
      completeness: -5,
      skillMatch: 60,
      projectQuality: 60,
      technicalDepth: 60,
      professionalExpression: 60,
    },
    strengths: ['a', ''],
    weaknesses: [],
    suggestions: [],
    projectSuggestions: [],
    optimizedExamples: [],
  })
  equal(result.score, 100)
  equal(result.dimensionScores.completeness, 0)
  deepEqual(result.strengths, ['a'])
  equal(result.summary, 'AI 已完成简历诊断。')
})

test('岗位匹配 parse_error 降级', () => {
  const result = normalizeJobMatchResult({ rawText: 'x', parseError: true })
  equal(result.matchScore, 0)
  deepEqual(result.risks, ['AI 返回内容不是合法 JSON，已保留原文。'])
})

test('项目优化 parse_error 用 dto 技术栈兜底', () => {
  const result = normalizeProjectResult({ rawText: '原文', parseError: true }, {
    rawContent: '',
    techStack: ['Vue'],
  })
  equal(result.projectDescription, '原文')
  deepEqual(result.techStack, ['Vue'])
})

test('面试点评 parse_error 给默认追问', () => {
  const result = normalizeFeedbackResult({ rawText: 'x', parseError: true })
  equal(result.score, 0)
  equal(result.followUpQuestion, '请继续补充你的思路、技术取舍和最终结果。')
})

test('面试总结 parse_error 降级', () => {
  const result = normalizeSummaryResult({ rawText: 'x', parseError: true })
  equal(result.totalScore, 0)
  deepEqual(result.weaknesses, ['AI 返回内容不是合法 JSON，已保留原文。'])
})
