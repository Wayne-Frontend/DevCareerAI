import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { AiThrottle } from '../../common/guards/ai-throttle.decorator'
import { runSseStream } from '../../common/utils/sse.util'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUserResponse } from '../auth/auth.types'
import { MatchJobDto } from './dto/match-job.dto'
import { JobService } from './job.service'

@ApiTags('岗位匹配')
@ApiBearerAuth()
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @AiThrottle()
  @Post('match')
  match(@Body() dto: MatchJobDto, @CurrentUser() user: AuthUserResponse) {
    return this.jobService.match(dto, user.id)
  }

  @Get('descriptions')
  findDescriptions(@CurrentUser() user: AuthUserResponse) {
    return this.jobService.findDescriptions(user.id)
  }

  @Get('descriptions/:id')
  findDescription(@Param('id') id: string, @CurrentUser() user: AuthUserResponse) {
    return this.jobService.findDescription(id, user.id)
  }

  @Delete('descriptions/:id')
  removeDescription(@Param('id') id: string, @CurrentUser() user: AuthUserResponse) {
    return this.jobService.removeDescription(id, user.id)
  }

  @AiThrottle()
  @Post('match/stream')
  matchStream(@Body() dto: MatchJobDto, @CurrentUser() user: AuthUserResponse, @Res() res: Response) {
    return runSseStream(res, 'Job match started', (callbacks) =>
      this.jobService.matchStream(dto, user.id, callbacks),
    )
  }
}
