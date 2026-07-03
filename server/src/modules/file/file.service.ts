import { BadRequestException, Injectable } from '@nestjs/common'
import pdfParse from 'pdf-parse'
import * as mammoth from 'mammoth'
import {
  matchesDocumentSignature,
  type DocumentExtension,
} from '../../common/utils/file-signature.util'
import { limitText } from '../../common/utils/text-limit.util'

const SUPPORTED_EXTENSIONS: DocumentExtension[] = ['pdf', 'docx', 'txt', 'md']

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

    if (!isSupportedExtension(extension)) {
      throw new BadRequestException('Only PDF, DOCX, TXT and MD files are supported')
    }

    // 扩展名可伪造，解析前用文件头魔数确认内容与扩展名相符，避免把损坏/伪造文件喂给解析器。
    if (!matchesDocumentSignature(file.buffer, extension)) {
      throw new BadRequestException('文件内容与扩展名不符，或文件已损坏，请重新选择文件')
    }

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

      throw new BadRequestException(
        'File parsing failed. Please check the file format and try again.',
      )
    }
  }
}

function decodeUploadFileName(fileName: string) {
  const decoded = Buffer.from(fileName, 'latin1').toString('utf8')
  return decoded.includes('�') ? fileName : decoded
}

function isSupportedExtension(extension: string): extension is DocumentExtension {
  return (SUPPORTED_EXTENSIONS as string[]).includes(extension)
}
