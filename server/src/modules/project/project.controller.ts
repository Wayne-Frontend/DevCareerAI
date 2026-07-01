import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { AiThrottle } from '../../common/guards/ai-throttle.decorator'
import { runSseStream } from '../../common/utils/sse.util'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUserResponse } from '../auth/auth.types'
import { OptimizeProjectDto } from './dto/optimize-project.dto'
import { ProjectService } from './project.service'

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @AiThrottle()
  @Post('optimize')
  optimize(@Body() dto: OptimizeProjectDto, @CurrentUser() user: AuthUserResponse) {
    return this.projectService.optimize(dto, user.id)
  }

  @Get('optimizations')
  findOptimizations(@CurrentUser() user: AuthUserResponse) {
    return this.projectService.findOptimizations(user.id)
  }

  @Get('optimizations/:id')
  findOptimization(@Param('id') id: string, @CurrentUser() user: AuthUserResponse) {
    return this.projectService.findOptimization(id, user.id)
  }

  @Delete('optimizations/:id')
  removeOptimization(@Param('id') id: string, @CurrentUser() user: AuthUserResponse) {
    return this.projectService.removeOptimization(id, user.id)
  }

  @AiThrottle()
  @Post('optimize/stream')
  optimizeStream(@Body() dto: OptimizeProjectDto, @CurrentUser() user: AuthUserResponse, @Res() res: Response) {
    return runSseStream(res, 'Project optimization started', (callbacks) =>
      this.projectService.optimizeStream(dto, user.id, callbacks),
    )
  }
}
