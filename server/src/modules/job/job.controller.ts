import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { AiThrottle } from '../../common/guards/ai-throttle.decorator'
import { createSseSession, getErrorMessage, writeSseEvent } from '../../common/utils/sse.util'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUserResponse } from '../auth/auth.types'
import { MatchJobDto } from './dto/match-job.dto'
import { JobService } from './job.service'

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
  async matchStream(@Body() dto: MatchJobDto, @CurrentUser() user: AuthUserResponse, @Res() res: Response) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Job match started' })

    try {
      const result = await this.jobService.matchStream(dto, user.id, {
        signal: session.signal,
        onDelta: (delta) => writeSseEvent(res, 'delta', { delta }),
        onUsage: (usage) => writeSseEvent(res, 'usage', usage),
      })
      writeSseEvent(res, 'done', result)
    } catch (error) {
      writeSseEvent(res, 'error', { message: getErrorMessage(error) })
    } finally {
      session.end()
    }
  }
}
