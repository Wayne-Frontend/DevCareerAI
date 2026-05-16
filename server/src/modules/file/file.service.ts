import { BadRequestException, Injectable } from '@nestjs/common'
import pdfParse from 'pdf-parse'
import * as mammoth from 'mammoth'
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

    const fileName = decodeUploadFileName(file.originalname)
    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    const content = await this.extractText(file.buffer, extension)
    const limited = limitText(content)

    return {
      fileName,
      fileType: extension,
      content: limited.text,
      truncated: limited.truncated,
    }
  }

  private async extractText(buffer: Buffer, extension: string) {
    try {
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
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }

      throw new BadRequestException('File parsing failed. Please check the file format and try again.')
    }
  }
}

function decodeUploadFileName(fileName: string) {
  const decoded = Buffer.from(fileName, 'latin1').toString('utf8')
  return decoded.includes('�') ? fileName : decoded
}
