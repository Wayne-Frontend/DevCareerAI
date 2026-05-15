import { Injectable } from '@nestjs/common'

export type HistoryType = 'resume-analysis' | 'project-optimization' | 'job-match' | 'interview'

@Injectable()
export class HistoryService {
  findAll(type: HistoryType = 'resume-analysis') {
    return [
      {
        id: `${type}-placeholder`,
        type,
        title: '占位历史记录',
        score: type === 'interview' ? 76 : 72,
        createdAt: new Date().toISOString(),
      },
    ]
  }

  remove(id: string) {
    return {
      id,
      success: true,
    }
  }
}
