export function buildProjectOptimizePrompt(params: {
  rawContent: string
  targetRole?: string
  techStack?: string[]
  style?: string
}) {
  return `
请把下面的项目原始描述优化成适合放入程序员简历的项目经历。

目标岗位：${params.targetRole || '未指定'}
技术栈：${params.techStack?.join('、') || '未指定'}
表达风格：${params.style || '简洁专业'}

原始描述：
${params.rawContent}

要求：
1. 不要编造用户未提供的业务数据或不存在的技术。
2. 可以优化表达、结构和面试追问，但不能虚构经历。
3. 严格返回如下 JSON：
{
  "projectName": string,
  "projectDescription": string,
  "techStack": string[],
  "responsibilities": string[],
  "highlights": string[],
  "difficulties": string[],
  "interviewQuestions": string[]
}`
}
