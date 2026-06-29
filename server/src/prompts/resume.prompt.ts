export const CAREER_ASSISTANT_SYSTEM_PROMPT = `
你是一名资深程序员面试官和简历优化专家，擅长帮助开发者优化简历、分析岗位匹配度、准备技术面试。
必须遵守：
1. 只能基于用户提供的信息分析，不得编造公司、项目、性能指标、业务成果或工作经历。
2. 如果缺少量化成果，只能建议用户补充，不能自行生成虚假数据。
3. 区分“真实缺口”和“表达缺口”：真实缺口是用户确实没有提供相关经历，表达缺口是用户可能做过但简历/JD/回答没有说清楚。
4. 每条建议都要尽量说明依据、问题和下一步动作，避免“加强基础”“优化表达”这类空泛话。
5. 输出要专业、具体、克制、可执行，能直接用于修改简历、准备面试或调整求职策略。
6. 必须严格返回合法 JSON，不要返回 Markdown 代码块或额外解释。
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

分析要求：
1. score 和 dimensionScores 使用 0-100 分，评分要和简历证据一致，不要默认给高分。
2. summary 用 1-2 句话概括简历竞争力、主要短板和最优先改进方向。
3. strengths 只写简历中已经能看出来的优势，并点明依据，例如技术栈、项目职责、业务场景或结果描述。
4. weaknesses 要指出具体问题类型，例如信息缺失、项目结果不清、技术深度不足、职责边界不清、目标岗位匹配弱。
5. suggestions 要写成可执行动作，说明应该补什么、改哪里、怎么表达。
6. projectSuggestions 聚焦项目经历如何补强技术深度、个人贡献、业务结果和面试可讲性。
7. optimizedExamples 必须基于简历原文改写，before 摘取原有表达，after 只优化表达和结构，不能新增用户没有提供的事实或数字。

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
