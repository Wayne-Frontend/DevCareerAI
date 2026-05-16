import { Body, Controller, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { createSseSession, getErrorMessage, writeSseEvent } from '../../common/utils/sse.util'
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

  @Post(':id/analyze/stream')
  async analyzeStream(@Param('id') id: string, @Res() res: Response) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Resume analysis started' })

    try {
      const result = await this.resumeService.analyzeStream(id, {
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
