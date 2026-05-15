import { BadRequestException, Injectable } from '@nestjs/common'
import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'
import { limitText } from '../../common/utils/text-limit.util'

export interface ParsedFileResult {
  fileName: string
  fileType: string
  content: string
  truncated: boolean
}

@Injectable()
export class FileService {
  async parse(file: Express.Multer.File): Promise<ParsedFileResult> {
    if (!file) {
      throw new BadRequestException('File is required')
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase() || ''
    const content = await this.extractText(file.buffer, extension)
    const limited = limitText(content)

    return {
      fileName: file.originalname,
      fileType: extension,
      content: limited.text,
      truncated: limited.truncated,
    }
  }

  private async extractText(buffer: Buffer, extension: string) {
    if (extension === 'txt' || extension === 'md') {
      return buffer.toString('utf8')
    }

    if (extension === 'pdf') {
      const result = await pdfParse(buffer)
      return result.text
    }

    if (extension === 'docx') {
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    }

    throw new BadRequestException('Only PDF, DOCX, TXT and MD files are supported')
  }
}
