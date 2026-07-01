import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Roles } from '../auth/roles.decorator'
import { AiUsageService } from './ai-usage.service'

@ApiTags('AI 用量')
@ApiBearerAuth()
@Roles('admin')
@Controller('ai-usage')
export class AiUsageController {
  constructor(private readonly aiUsageService: AiUsageService) {}

  /**
   * 全局 AI token 用量汇总（总计 / 按功能 / 按模型 / 按天）。仅管理员可访问。
   */
  @Get('summary')
  getSummary(@Query('days') days?: string) {
    return this.aiUsageService.getSummary(days ? Number(days) : undefined)
  }
}
