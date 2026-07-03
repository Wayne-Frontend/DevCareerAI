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
<raw_project>
${params.rawContent}
</raw_project>

要求：
1. 不要编造用户未提供的业务数据、性能指标、用户规模、公司背景或不存在的技术。
2. 可以优化表达、结构、重点和面试追问，但不能虚构经历、职责、成果或技术难点。
3. projectName 是“简历展示名称建议”，不要凭空创造夸张品牌名或业务名。
4. projectDescription 使用适合简历的专业表达，突出背景、核心能力、个人贡献和结果；如果缺少结果，只提示可补充的结果类型，不要生成数字。
5. techStack 优先使用用户提供的技术栈；原文没有依据时不要新增核心技术。
6. responsibilities 要体现“我做了什么”，避免写成团队整体功能清单；给 3-5 条。
7. highlights 只能围绕已有技术、职责和业务场景提炼，不能强行包装高并发、架构重构、性能优化等经历；给 2-4 条。
8. difficulties 要生成面试中可能被追问的真实技术难点；如果原文缺少难点，就指出可补充的技术取舍或边界场景；给 2-4 条。
9. interviewQuestions 要围绕该项目内容生成，避免通用八股题；给 3-5 条。

请严格返回如下 JSON：
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
