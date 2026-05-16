import { Body, Controller, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { createSseSession, getErrorMessage, writeSseEvent } from '../../common/utils/sse.util'
import { MatchJobDto } from './dto/match-job.dto'
import { JobService } from './job.service'

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post('match')
  match(@Body() dto: MatchJobDto) {
    return this.jobService.match(dto)
  }

  @Post('match/stream')
  async matchStream(@Body() dto: MatchJobDto, @Res() res: Response) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Job match started' })

    try {
      const result = await this.jobService.matchStream(dto, {
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
