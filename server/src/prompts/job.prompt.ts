export function buildJobMatchPrompt(params: {
  resumeContent: string
  jobTitle: string
  jobDescription: string
}) {
  return `
请分析下面这份简历和目标岗位 JD 的匹配度。

简历内容：
<resume>
${params.resumeContent}
</resume>

岗位名称：${params.jobTitle}

岗位 JD：
<jd>
${params.jobDescription}
</jd>

分析要求：
1. matchScore 使用 0-100 分，按系统提示的分档口径，结合 JD 硬性要求、简历证据强弱和表达完整度综合判断。
2. summary 用 1-2 句话说明整体匹配结论、最关键优势和最大风险。
3. dimensionScores 同样按分档口径打分：skillMatch 看技术栈匹配，projectRelevance 看项目场景相关性，engineeringAbility 看工程化/协作/质量能力，businessUnderstanding 看业务理解和结果表达。
4. matchedKeywords 必须来自 JD 与简历共同出现或语义明确匹配的内容，不能随意补充热门技术词；给 3-8 个。
5. missingKeywords 必须来自 JD 但简历缺失、弱表达或证据不足的内容；给 3-8 个。
6. advantages 要说明“为什么算优势”，尽量对应简历中的具体内容；给 2-4 条。
7. risks 要区分硬性缺口和表达缺口；如果只是表达不充分，要明确建议补充证据，而不是判定用户没有能力；给 2-4 条。
8. resumeSuggestions 要直接告诉用户简历如何改，包括补充位置、表达角度和需要避免编造的边界；给 3-5 条。
9. interviewPreparation 要围绕 JD 风险点生成准备建议，包括可被追问的问题方向和需要提前整理的案例；给 3-5 条。

请严格返回如下 JSON：
{
  "matchScore": number,
  "summary": string,
  "dimensionScores": {
    "skillMatch": number,
    "projectRelevance": number,
    "engineeringAbility": number,
    "businessUnderstanding": number
  },
  "matchedKeywords": string[],
  "missingKeywords": string[],
  "advantages": string[],
  "risks": string[],
  "resumeSuggestions": string[],
  "interviewPreparation": string[]
}`
}
