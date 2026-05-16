export function buildInterviewQuestionPrompt(params: {
  resumeContent: string
  jobDescription?: string
  targetRole: string
  interviewType: string
  difficulty: string
}) {
  return `
你现在是一名技术面试官。请基于候选人的简历和目标岗位生成一个具体面试问题。
候选人简历：
${params.resumeContent}

目标岗位：${params.targetRole}
岗位 JD：${params.jobDescription || '未提供'}
面试类型：${params.interviewType}
难度：${params.difficulty}

请严格返回如下 JSON：
{
  "question": string,
  "questionType": string,
  "expectedPoints": string[]
}`
}

export function buildInterviewFeedbackPrompt(params: {
  question: string
  answer: string
  resumeContent: string
}) {
  return `
请点评候选人的回答，并生成下一道追问。
面试问题：${params.question}
候选人回答：${params.answer}

候选人简历：
${params.resumeContent}

请严格返回如下 JSON：
{
  "score": number,
  "comment": string,
  "problems": string[],
  "betterAnswer": string,
  "followUpQuestion": string
}`
}

export function buildInterviewSummaryPrompt(params: {
  messages: Array<{ role: string; content: string }>
  targetRole?: string
}) {
  const transcript = params.messages.map((item) => `${item.role}: ${item.content}`).join('\n')

  return `
请基于以下模拟面试记录生成总结。
目标岗位：${params.targetRole || '未指定'}

面试记录：
${transcript}

请严格返回如下 JSON：
{
  "totalScore": number,
  "summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "studyPlan": string[]
}`
}
