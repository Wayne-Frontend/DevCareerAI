import { Module } from '@nestjs/common'
import { FileModule } from '../file/file.module'
import { ResumeController } from './resume.controller'
import { ResumeService } from './resume.service'

@Module({
  imports: [FileModule],
  controllers: [ResumeController],
  providers: [ResumeService],
})
export class ResumeModule {}
