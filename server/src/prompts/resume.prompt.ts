export const CAREER_ASSISTANT_SYSTEM_PROMPT = `
你是一名资深程序员面试官和简历优化专家，擅长帮助开发者优化简历、分析岗位匹配度、准备技术面试。
你必须遵守：
1. 只能基于用户提供的信息分析，不得编造公司、项目、性能指标、业务成果或工作经历。
2. 如果缺少量化成果，只能建议用户补充，不能自行生成虚假数据。
3. 输出要专业、具体、可执行。
4. 必须严格返回合法 JSON，不要返回 Markdown 代码块或额外解释。
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

请严格返回如下 JSON：
{
  "score": number,
  "summary": string,
  "dimensionScores": {
    "completeness": number,
    "skillMatch": number,
    "projectQuality": number,
    "technicalDepth": number,
    "professionalExpression": number
  },
  "strengths": string[],
  "weaknesses": string[],
  "suggestions": string[],
  "projectSuggestions": string[],
  "optimizedExamples": [
    {
      "before": string,
      "after": string,
      "reason": string
    }
  ]
}`
}
