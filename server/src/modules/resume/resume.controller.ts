import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { createSseSession, getErrorMessage, writeSseEvent } from '../../common/utils/sse.util'
import { FileService } from '../file/file.service'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUserResponse } from '../auth/auth.types'
import { CreateResumeDto } from './dto/create-resume.dto'
import { ResumeService } from './resume.service'

const SUPPORTED_RESUME_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'md'])

@Controller('resumes')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly fileService: FileService,
  ) {}

  @Post()
  create(@Body() dto: CreateResumeDto, @CurrentUser() user: AuthUserResponse) {
    return this.resumeService.create(dto, user.id)
  }

  @Get()
  findAll(@CurrentUser() user: AuthUserResponse) {
    return this.resumeService.findAll(user.id)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUserResponse) {
    return this.resumeService.findOne(id, user.id)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUserResponse) {
    return this.resumeService.remove(id, user.id)
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const extension = file.originalname.split('.').pop()?.toLowerCase() || ''
        const accepted = SUPPORTED_RESUME_EXTENSIONS.has(extension)

        callback(
          accepted ? null : new BadRequestException('Only PDF, DOCX, TXT and MD files are supported'),
          accepted,
        )
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.fileService.parse(file)
  }

  @Post(':id/analyze')
  analyze(@Param('id') id: string, @CurrentUser() user: AuthUserResponse) {
    return this.resumeService.analyze(id, user.id)
  }

  @Post(':id/analyze/stream')
  async analyzeStream(@Param('id') id: string, @CurrentUser() user: AuthUserResponse, @Res() res: Response) {
    const session = createSseSession(res)
    writeSseEvent(res, 'start', { message: 'Resume analysis started' })

    try {
      const result = await this.resumeService.analyzeStream(id, user.id, {
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
