import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AiModule } from './modules/ai/ai.module'
import { FileModule } from './modules/file/file.module'
import { HistoryModule } from './modules/history/history.module'
import { InterviewModule } from './modules/interview/interview.module'
import { JobModule } from './modules/job/job.module'
import { ProjectModule } from './modules/project/project.module'
import { ResumeModule } from './modules/resume/resume.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AiModule,
    FileModule,
    ResumeModule,
    ProjectModule,
    JobModule,
    InterviewModule,
    HistoryModule,
  ],
})
export class AppModule {}
