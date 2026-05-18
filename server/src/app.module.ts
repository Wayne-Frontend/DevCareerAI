import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { AiModule } from './modules/ai/ai.module'
import { AuthGuard } from './modules/auth/auth.guard'
import { AuthModule } from './modules/auth/auth.module'
import { FileModule } from './modules/file/file.module'
import { HistoryModule } from './modules/history/history.module'
import { InterviewModule } from './modules/interview/interview.module'
import { JobModule } from './modules/job/job.module'
import { ProjectModule } from './modules/project/project.module'
import { ResumeModule } from './modules/resume/resume.module'
import { PrismaModule } from './prisma/prisma.module'
import { validateEnv } from './config/env.validation'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    AiModule,
    FileModule,
    ResumeModule,
    ProjectModule,
    JobModule,
    InterviewModule,
    HistoryModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
