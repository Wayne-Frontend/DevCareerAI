import { Body, Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { FileService } from '../file/file.service'
import { CreateResumeDto } from './dto/create-resume.dto'
import { ResumeService } from './resume.service'

@Controller('resumes')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly fileService: FileService,
  ) {}

  @Post()
  create(@Body() dto: CreateResumeDto) {
    return this.resumeService.create(dto)
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.fileService.parse(file)
  }

  @Post(':id/analyze')
  analyze(@Param('id') id: string) {
    return this.resumeService.analyze(id)
  }
}
