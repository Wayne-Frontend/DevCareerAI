export function buildProjectOptimizePrompt(params: {
  rawContent: string
  targetRole?: string
  techStack?: string[]
  style?: string
}) {
  return `
请把下面的项目原始描述优化成适合程序员简历的项目经历。
目标岗位：${params.targetRole || '未指定'}
技术栈：${params.techStack?.join('、') || '未指定'}
表达风格：${params.style || '简洁专业'}

原始描述：
${params.rawContent}

请严格返回 JSON，不要返回 Markdown 代码块。
`
}
