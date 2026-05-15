import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { CreateInterviewDto } from './dto/create-interview.dto'
import { SubmitAnswerDto } from './dto/submit-answer.dto'

@Injectable()
export class InterviewService {
  create(dto: CreateInterviewDto) {
    return {
      sessionId: randomUUID(),
      firstQuestion: `请结合你的项目经历，介绍一个最能体现 ${dto.targetRole} 能力的项目。`,
      expectedPoints: ['项目背景', '个人职责', '技术方案', '结果复盘'],
    }
  }

  submitAnswer(sessionId: string, dto: SubmitAnswerDto) {
    return {
      sessionId,
      feedback: {
        score: Math.min(85, Math.max(60, dto.answer.length > 80 ? 78 : 66)),
        comment: '这是占位点评：回答已收到，后续会接入 AI 给出更细的追问和参考答案。',
        problems: ['目前尚未进行真实语义分析'],
        betterAnswer: '建议按背景、任务、行动、结果的顺序展开，并补充技术取舍。',
      },
      nextQuestion: '请继续说明你在这个项目中遇到的一个技术难点，以及你如何解决它。',
    }
  }

  finish(sessionId: string) {
    return {
      sessionId,
      totalScore: 76,
      summary: '占位面试总结：基础表达完整，后续接入 AI 后会生成真实强弱项和学习计划。',
      strengths: ['回答流程完整'],
      weaknesses: ['缺少真实追问分析'],
      studyPlan: ['补充项目复盘材料', '准备性能优化与工程化问题'],
    }
  }
}
