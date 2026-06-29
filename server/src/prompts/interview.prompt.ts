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

出题要求：
1. 问题必须结合候选人简历、目标岗位、JD 或面试类型，不要问“介绍一下你自己”这类泛泛问题。
2. 如果是项目面试，优先围绕项目背景、个人职责、技术取舍、难点、结果和复盘提问。
3. 如果是技术面，优先结合候选人技术栈与岗位要求提问，避免脱离上下文的随机八股。
4. 难度要体现在追问深度上：简单关注概念和经历，中等关注设计取舍，困难关注边界、权衡和复盘。
5. expectedPoints 写面试官期待听到的关键要点，不要写标准答案全文。

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

点评要求：
1. score 使用 0-100 分，依据回答完整度、技术准确性、项目细节、表达结构和岗位相关性评分。
2. comment 先肯定回答中明确有效的部分，再指出最关键的改进方向。
3. problems 只列具体问题，例如缺少背景、职责不清、技术取舍不足、没有结果数据、回答偏泛。
4. betterAnswer 要给出可学习的参考表达，但不能替候选人编造未提供的公司、指标、业务结果或经历。
5. followUpQuestion 必须承接本轮问题或候选人回答继续深入，不要无关跳题。

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

总结要求：
1. totalScore 使用 0-100 分，综合回答质量、技术深度、项目表达、沟通结构和岗位匹配度判断。
2. summary 用 2-4 句话总结整体表现、核心优势、主要短板和下一步训练重点。
3. strengths 只写面试记录中真实体现出来的优势。
4. weaknesses 要具体到可训练的问题，例如“项目结果表达不足”“技术取舍讲不清”“缺少边界场景”。
5. studyPlan 要按可执行动作输出，包含复习主题、练习方式和下一轮面试前要准备的材料。

请严格返回如下 JSON：
{
  "totalScore": number,
  "summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "studyPlan": string[]
}`
}
