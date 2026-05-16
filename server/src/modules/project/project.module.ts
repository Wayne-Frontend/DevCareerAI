import { Module } from '@nestjs/common'
import { AiModule } from '../ai/ai.module'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

@Module({
  imports: [AiModule],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
