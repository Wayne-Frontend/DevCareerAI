import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { createSseSession, getErrorMessage, writeSseEvent } from '../../common/utils/sse.util'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUserResponse } from '../auth/auth.types'
import { OptimizeProjectDto } from './dto/optimize-project.dto'
import { ProjectService } from './project.service'

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

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

  @Post('optimize/stream')
  async optimizeStream(@Body() dto: OptimizeProjectDto, @CurrentUser() user: AuthUserResponse, @Res() res: Response) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Project optimization started' })

    try {
      const result = await this.projectService.optimizeStream(dto, user.id, {
        signal: session.signal,
        onDelta: (delta) => writeSseEvent(res, 'delta', { delta }),
        onUsage: (usage) => writeSseEvent(res, 'usage', usage),
      })
      writeSseEvent(res, 'done', result)
    } catch (error) {
      writeSseEvent(res, 'error', { message: getErrorMessage(error) })
    } finally {
      session.end()
    }
  }
}
