import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AiUsageService } from './ai-usage.service'

@ApiTags('AI 用量')
@ApiBearerAuth()
@Controller('ai-usage')
export class AiUsageController {
  constructor(private readonly aiUsageService: AiUsageService) {}

  /**
   * 全局 AI token 用量汇总（总计 / 按功能 / 按模型 / 按天）。
   * 注意：当前对所有已登录用户可见，上线前应加管理员鉴权。
   */
  @Get('summary')
  getSummary(@Query('days') days?: string) {
    return this.aiUsageService.getSummary(days ? Number(days) : undefined)
  }
}
