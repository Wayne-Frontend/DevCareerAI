import { Body, Controller, Post } from '@nestjs/common'
import { MatchJobDto } from './dto/match-job.dto'
import { JobService } from './job.service'

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post('match')
  match(@Body() dto: MatchJobDto) {
    return this.jobService.match(dto)
  }
}
