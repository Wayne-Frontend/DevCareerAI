import { Body, Controller, Param, Post, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { AiThrottle } from '../../common/guards/ai-throttle.decorator'
import { runSseStream } from '../../common/utils/sse.util'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUserResponse } from '../auth/auth.types'
import { CreateInterviewDto } from './dto/create-interview.dto'
import { SubmitAnswerDto } from './dto/submit-answer.dto'
import { InterviewService } from './interview.service'

@ApiTags('模拟面试')
@ApiBearerAuth()
@AiThrottle()
@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  create(@Body() dto: CreateInterviewDto, @CurrentUser() user: AuthUserResponse) {
    return this.interviewService.create(dto, user.id)
  }

  @Post('stream')
  createStream(
    @Body() dto: CreateInterviewDto,
    @CurrentUser() user: AuthUserResponse,
    @Res() res: Response,
  ) {
    return runSseStream(res, 'Interview session generation started', (callbacks) =>
      this.interviewService.createStream(dto, user.id, callbacks),
    )
  }

  @Post(':sessionId/messages')
  submitAnswer(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: AuthUserResponse,
  ) {
    return this.interviewService.submitAnswer(sessionId, dto, user.id)
  }

  @Post(':sessionId/messages/stream')
  submitAnswerStream(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: AuthUserResponse,
    @Res() res: Response,
  ) {
    return runSseStream(res, 'Interview feedback generation started', (callbacks) =>
      this.interviewService.submitAnswerStream(sessionId, dto, user.id, callbacks),
    )
  }

  @Post(':sessionId/finish')
  finish(@Param('sessionId') sessionId: string, @CurrentUser() user: AuthUserResponse) {
    return this.interviewService.finish(sessionId, user.id)
  }

  @Post(':sessionId/finish/stream')
  finishStream(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthUserResponse,
    @Res() res: Response,
  ) {
    return runSseStream(res, 'Interview summary generation started', (callbacks) =>
      this.interviewService.finishStream(sessionId, user.id, callbacks),
    )
  }
}
