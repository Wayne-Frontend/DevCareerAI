import { Injectable } from '@nestjs/common'
import { OptimizeProjectDto } from './dto/optimize-project.dto'

@Injectable()
export class ProjectService {
  optimize(dto: OptimizeProjectDto) {
    return {
      projectName: '项目名称占位',
      projectDescription: '这是基础架构阶段的占位优化结果，后续会根据原始描述调用 AI 生成。',
      techStack: dto.techStack?.length ? dto.techStack : ['Vue 3', 'TypeScript', 'NestJS'],
      responsibilities: ['梳理页面模块和接口边界', '完成核心页面占位和状态管理结构'],
      highlights: ['前后端接口结构已可联调', 'AI 服务已集中封装'],
      difficulties: ['真实业务难点将在下一阶段由 AI 分析生成'],
      interviewQuestions: ['你在这个项目中负责哪些模块？', '这个项目的技术难点是什么？'],
    }
  }
}
