import { Body, Controller, Post } from '@nestjs/common'
import { OptimizeProjectDto } from './dto/optimize-project.dto'
import { ProjectService } from './project.service'

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('optimize')
  optimize(@Body() dto: OptimizeProjectDto) {
    return this.projectService.optimize(dto)
  }
}
