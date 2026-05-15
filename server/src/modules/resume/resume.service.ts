import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { CreateResumeDto } from './dto/create-resume.dto'

@Injectable()
export class ResumeService {
  create(dto: CreateResumeDto) {
    return {
      id: randomUUID(),
      ...dto,
    }
  }

  analyze(id: string) {
    const result = {
      score: 76,
      summary: '这是基础架构阶段的占位诊断结果，后续会接入 AiService 生成真实分析。',
      dimensionScores: {
        completeness: 75,
        skillMatch: 78,
        projectQuality: 74,
        technicalDepth: 72,
        professionalExpression: 80,
      },
      strengths: ['信息结构清晰', '技术栈表达具备进一步分析基础'],
      weaknesses: ['暂未接入真实 AI 判断', '项目成果和量化指标需要后续补充'],
      suggestions: ['补充项目职责边界', '补充性能、质量或业务结果证据'],
      projectSuggestions: ['将项目背景、技术方案、个人贡献拆开描述'],
      optimizedExamples: [
        {
          before: '负责后台页面开发。',
          after: '负责核心业务后台的模块开发、状态管理和接口联调，保障页面交互稳定。',
          reason: '占位示例：让职责更具体。',
        },
      ],
    }

    return {
      analysisId: randomUUID(),
      resumeId: id,
      score: result.score,
      result,
    }
  }
}
