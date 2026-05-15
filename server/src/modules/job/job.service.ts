import { Injectable } from '@nestjs/common'
import { MatchJobDto } from './dto/match-job.dto'

@Injectable()
export class JobService {
  match(dto: MatchJobDto) {
    const result = {
      matchScore: 72,
      summary: `这是 ${dto.jobTitle} 的占位匹配结果，后续会接入 AI 对简历和 JD 做真实对比。`,
      matchedKeywords: ['TypeScript', 'Vue', '工程化'],
      missingKeywords: ['性能优化', '组件库建设'],
      advantages: ['简历内容已具备基础匹配分析入口'],
      risks: ['当前结果为占位数据，不能作为真实求职判断'],
      resumeSuggestions: ['补充和岗位要求直接相关的项目证据'],
      interviewPreparation: ['准备项目难点、性能优化、团队协作相关问题'],
    }

    return {
      matchScore: result.matchScore,
      result,
    }
  }
}
