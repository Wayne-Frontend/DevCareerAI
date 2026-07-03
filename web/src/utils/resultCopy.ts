type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function numberText(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? `${Math.round(number)} 分` : ''
}

function list(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      const itemRecord = asRecord(item)
      const before = text(itemRecord.before)
      const after = text(itemRecord.after)
      const reason = text(itemRecord.reason)
      if (before || after || reason)
        return [before && `原：${before}`, after && `优化：${after}`, reason && `原因：${reason}`]
          .filter(Boolean)
          .join('\n')
      return Object.keys(itemRecord).length ? JSON.stringify(itemRecord) : String(item)
    })
    .filter(Boolean)
}

function line(label: string, value: string | string[]) {
  const content = Array.isArray(value) ? value.filter(Boolean).join('；') : value
  return content ? `${label}：${content}` : ''
}

function joinLines(lines: Array<string | false | undefined>) {
  return lines.filter(Boolean).join('\n')
}

export function buildResumeSuggestionCopy(detail: unknown) {
  const record = asRecord(detail)
  return (
    joinLines([
      line('简历综合评分', numberText(record.score)),
      line('摘要', text(record.summary)),
      line('优势', list(record.strengths)),
      line('存在问题', list(record.weaknesses)),
      line('优化建议', list(record.suggestions)),
      line('项目经历优化方向', list(record.projectSuggestions)),
      line('优化示例', list(record.optimizedExamples)),
    ]) || '暂无可复制的简历诊断内容。'
  )
}

export function buildProjectCopy(detail: unknown) {
  const record = asRecord(detail)
  return (
    joinLines([
      line('项目名称', text(record.projectName)),
      line('项目描述', text(record.projectDescription)),
      line('技术栈', list(record.techStack).join('、')),
      line('个人职责', list(record.responsibilities)),
      line('技术亮点', list(record.highlights)),
      line('项目难点', list(record.difficulties)),
      line('面试追问', list(record.interviewQuestions)),
    ]) || '暂无可复制的项目优化内容。'
  )
}

export function buildJobMatchCopy(detail: unknown) {
  const record = asRecord(detail)
  return (
    joinLines([
      line('岗位匹配度', numberText(record.matchScore)),
      line('摘要', text(record.summary)),
      line('匹配关键词', list(record.matchedKeywords).join('、')),
      line('缺失关键词', list(record.missingKeywords).join('、')),
      line('优势', list(record.advantages)),
      line('风险点', list(record.risks)),
      line('简历修改建议', list(record.resumeSuggestions)),
      line('面试准备建议', list(record.interviewPreparation)),
    ]) || '暂无可复制的岗位匹配内容。'
  )
}

export function buildInterviewStudyPlanCopy(detail: unknown) {
  const record = asRecord(detail)
  return (
    joinLines([
      line('面试总分', numberText(record.totalScore)),
      line('总结', text(record.summary)),
      line('优势', list(record.strengths)),
      line('短板', list(record.weaknesses)),
      line('学习计划', list(record.studyPlan)),
    ]) || '暂无可复制的模拟面试复盘内容。'
  )
}
