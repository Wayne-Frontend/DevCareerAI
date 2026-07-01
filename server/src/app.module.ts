import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { UserThrottlerGuard } from './common/guards/user-throttler.guard'
import { AiModule } from './modules/ai/ai.module'
import { AuthGuard } from './modules/auth/auth.guard'
import { AuthModule } from './modules/auth/auth.module'
import { FileModule } from './modules/file/file.module'
import { HistoryModule } from './modules/history/history.module'
import { InterviewModule } from './modules/interview/interview.module'
import { JobModule } from './modules/job/job.module'
import { MaintenanceModule } from './modules/maintenance/maintenance.module'
import { ProjectModule } from './modules/project/project.module'
import { ResumeModule } from './modules/resume/resume.module'
import { PrismaModule } from './prisma/prisma.module'
import { validateEnv } from './config/env.validation'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AiModule,
    FileModule,
    ResumeModule,
    ProjectModule,
    JobModule,
    InterviewModule,
    HistoryModule,
    MaintenanceModule,
  ],
  providers: [
    // AuthGuard 必须排在限流之前，确保 request.user 已就绪、限流可按用户计数。
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
  ],
})
export class AppModule {}
