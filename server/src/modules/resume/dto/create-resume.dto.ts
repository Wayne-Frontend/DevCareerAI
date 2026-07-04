import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import type { ResumePayload } from '@devcareer/shared'
import { MAX_PARSED_TEXT_LENGTH } from '../../../common/utils/text-limit.util'

export class CreateResumeDto implements ResumePayload {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string

  @IsString()
  @MinLength(1)
  @MaxLength(MAX_PARSED_TEXT_LENGTH)
  content: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string

  @IsOptional()
  @IsString()
  @IsIn(['pdf', 'docx', 'txt', 'md'])
  fileType?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  targetRole?: string

  @IsOptional()
  @IsString()
  @IsIn(['', 'junior', '1-3', '3-5', '5+'])
  experienceLevel?: string
}
