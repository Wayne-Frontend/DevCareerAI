export const CAREER_ASSISTANT_SYSTEM_PROMPT = `
你是一名资深程序员面试官和简历优化专家，擅长帮助开发者优化简历、分析岗位匹配度、准备技术面试。
你必须只基于用户提供的信息进行分析，不得编造公司、项目、数据、性能指标或业务成果。
输出必须专业、具体、可执行，并尽量符合指定 JSON 结构。
`

export function buildResumeAnalyzePrompt(params: {
  targetRole?: string
  experienceLevel?: string
  resumeContent: string
}) {
  return `
请分析下面这份程序员简历。
目标岗位：${params.targetRole || '未指定'}
经验年限：${params.experienceLevel || '未指定'}

简历内容：
${params.resumeContent}

请严格返回 JSON，不要返回 Markdown 代码块。
`
}
