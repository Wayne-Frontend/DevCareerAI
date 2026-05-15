import { Body, Controller, Param, Post } from '@nestjs/common'
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

  @Post(':sessionId/messages')
  submitAnswer(@Param('sessionId') sessionId: string, @Body() dto: SubmitAnswerDto) {
    return this.interviewService.submitAnswer(sessionId, dto)
  }

  @Post(':sessionId/finish')
  finish(@Param('sessionId') sessionId: string) {
    return this.interviewService.finish(sessionId)
  }
}
