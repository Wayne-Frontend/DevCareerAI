import { Controller, Delete, Get, Param, Query } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUserResponse } from '../auth/auth.types'
import { HistoryService, HistoryType } from './history.service'

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(@Query('type') type: HistoryType, @CurrentUser() user: AuthUserResponse) {
    return this.historyService.findAll(user.id, type)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUserResponse) {
    return this.historyService.remove(id, user.id)
  }
}
