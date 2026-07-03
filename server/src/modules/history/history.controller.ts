import { Controller, Delete, Get, Param, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUserResponse } from '../auth/auth.types'
import { HistoryService, HistoryType } from './history.service'

@ApiTags('历史记录')
@ApiBearerAuth()
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(@Query('type') type: HistoryType, @CurrentUser() user: AuthUserResponse) {
    return this.historyService.findAll(user.id, type)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUserResponse) {
    return this.historyService.findOne(id, user.id)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUserResponse) {
    return this.historyService.remove(id, user.id)
  }
}
