import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common'
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
@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  // 仅 AI 生成端点做 AI 级限流；会话查询走全局限流即可。
  @Get()
  listSessions(@CurrentUser() user: AuthUserResponse) {
    return this.interviewService.listSessions(user.id)
  }

  @Get(':sessionId')
  getSession(@Param('sessionId') sessionId: string, @CurrentUser() user: AuthUserResponse) {
    return this.interviewService.getSession(sessionId, user.id)
  }

  @AiThrottle()
  @Post()
  create(@Body() dto: CreateInterviewDto, @CurrentUser() user: AuthUserResponse) {
    return this.interviewService.create(dto, user.id)
  }

  @AiThrottle()
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

  @AiThrottle()
  @Post(':sessionId/messages')
  submitAnswer(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: AuthUserResponse,
  ) {
    return this.interviewService.submitAnswer(sessionId, dto, user.id)
  }

  @AiThrottle()
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

  @AiThrottle()
  @Post(':sessionId/finish')
  finish(@Param('sessionId') sessionId: string, @CurrentUser() user: AuthUserResponse) {
    return this.interviewService.finish(sessionId, user.id)
  }

  @AiThrottle()
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
