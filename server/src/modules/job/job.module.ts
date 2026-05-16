import { Module } from '@nestjs/common'
import { AiModule } from '../ai/ai.module'
import { JobController } from './job.controller'
import { JobService } from './job.service'

@Module({
  imports: [AiModule],
  controllers: [JobController],
  providers: [JobService],
})
export class JobModule {}
