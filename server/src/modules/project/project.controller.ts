import { Body, Controller, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { createSseSession, getErrorMessage, writeSseEvent } from '../../common/utils/sse.util'
import { OptimizeProjectDto } from './dto/optimize-project.dto'
import { ProjectService } from './project.service'

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('optimize')
  optimize(@Body() dto: OptimizeProjectDto) {
    return this.projectService.optimize(dto)
  }

  @Post('optimize/stream')
  async optimizeStream(@Body() dto: OptimizeProjectDto, @Res() res: Response) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Project optimization started' })

    try {
      const result = await this.projectService.optimizeStream(dto, {
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
