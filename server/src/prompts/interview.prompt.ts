export function buildInterviewQuestionPrompt(params: {
  resumeContent: string
  jobDescription?: string
  targetRole: string
  interviewType: string
  difficulty: string
}) {
  return `
你现在是一名前端技术面试官。
候选人简历：
${params.resumeContent}

目标岗位：${params.targetRole}
岗位 JD：${params.jobDescription || '未提供'}
面试类型：${params.interviewType}
难度：${params.difficulty}

请生成一个面试问题，并严格返回 JSON。
`
}

export function buildInterviewFeedbackPrompt(params: {
  question: string
  answer: string
  resumeContent: string
}) {
  return `
请点评候选人的回答。

面试问题：${params.question}
候选人回答：${params.answer}

候选人简历：
${params.resumeContent}

请严格返回 JSON。
`
}
