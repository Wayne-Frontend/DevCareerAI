import { Body, Controller, Param, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { createSseSession, getErrorMessage, writeSseEvent } from '../../common/utils/sse.util'
import { CreateInterviewDto } from './dto/create-interview.dto'
import { SubmitAnswerDto } from './dto/submit-answer.dto'
import { InterviewService } from './interview.service'

@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  create(@Body() dto: CreateInterviewDto) {
    return this.interviewService.create(dto)
  }

  @Post('stream')
  async createStream(@Body() dto: CreateInterviewDto, @Res() res: Response) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Interview session generation started' })

    try {
      const result = await this.interviewService.createStream(dto, {
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
  submitAnswer(@Param('sessionId') sessionId: string, @Body() dto: SubmitAnswerDto) {
    return this.interviewService.submitAnswer(sessionId, dto)
  }

  @Post(':sessionId/messages/stream')
  async submitAnswerStream(@Param('sessionId') sessionId: string, @Body() dto: SubmitAnswerDto, @Res() res: Response) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Interview feedback generation started' })

    try {
      const result = await this.interviewService.submitAnswerStream(sessionId, dto, {
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
  finish(@Param('sessionId') sessionId: string) {
    return this.interviewService.finish(sessionId)
  }

  @Post(':sessionId/finish/stream')
  async finishStream(@Param('sessionId') sessionId: string, @Res() res: Response) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Interview summary generation started' })

    try {
      const result = await this.interviewService.finishStream(sessionId, {
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
