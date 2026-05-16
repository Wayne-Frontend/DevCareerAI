import { Module } from '@nestjs/common'
import { AiModule } from '../ai/ai.module'
import { FileModule } from '../file/file.module'
import { ResumeController } from './resume.controller'
import { ResumeService } from './resume.service'

@Module({
  imports: [AiModule, FileModule],
  controllers: [ResumeController],
  providers: [ResumeService],
})
export class ResumeModule {}
