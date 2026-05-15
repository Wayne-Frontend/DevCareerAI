import { Controller, Delete, Get, Param, Query } from '@nestjs/common'
import { HistoryService, HistoryType } from './history.service'

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(@Query('type') type: HistoryType) {
    return this.historyService.findAll(type)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.historyService.remove(id)
  }
}
