export function buildJobMatchPrompt(params: {
  resumeContent: string
  jobTitle: string
  jobDescription: string
}) {
  return `
请分析下面这份简历和目标岗位 JD 的匹配度。

简历内容：
${params.resumeContent}

岗位名称：${params.jobTitle}

岗位 JD：
${params.jobDescription}

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
