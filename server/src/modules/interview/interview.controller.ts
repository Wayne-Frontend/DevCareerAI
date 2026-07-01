import { Body, Controller, Param, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { AiThrottle } from '../../common/guards/ai-throttle.decorator'
import { createSseSession, getErrorMessage, writeSseEvent } from '../../common/utils/sse.util'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUserResponse } from '../auth/auth.types'
import { CreateInterviewDto } from './dto/create-interview.dto'
import { SubmitAnswerDto } from './dto/submit-answer.dto'
import { InterviewService } from './interview.service'

@AiThrottle()
@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  create(@Body() dto: CreateInterviewDto, @CurrentUser() user: AuthUserResponse) {
    return this.interviewService.create(dto, user.id)
  }

  @Post('stream')
  async createStream(@Body() dto: CreateInterviewDto, @CurrentUser() user: AuthUserResponse, @Res() res: Response) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Interview session generation started' })

    try {
      const result = await this.interviewService.createStream(dto, user.id, {
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

  @Post(':sessionId/messages')
  submitAnswer(@Param('sessionId') sessionId: string, @Body() dto: SubmitAnswerDto, @CurrentUser() user: AuthUserResponse) {
    return this.interviewService.submitAnswer(sessionId, dto, user.id)
  }

  @Post(':sessionId/messages/stream')
  async submitAnswerStream(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: AuthUserResponse,
    @Res() res: Response,
  ) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Interview feedback generation started' })

    try {
      const result = await this.interviewService.submitAnswerStream(sessionId, dto, user.id, {
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

  @Post(':sessionId/finish')
  finish(@Param('sessionId') sessionId: string, @CurrentUser() user: AuthUserResponse) {
    return this.interviewService.finish(sessionId, user.id)
  }

  @Post(':sessionId/finish/stream')
  async finishStream(@Param('sessionId') sessionId: string, @CurrentUser() user: AuthUserResponse, @Res() res: Response) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Interview summary generation started' })

    try {
      const result = await this.interviewService.finishStream(sessionId, user.id, {
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
