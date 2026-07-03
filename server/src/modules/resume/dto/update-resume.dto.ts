import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import type { UpdateResumePayload } from '@devcareer/shared'
import { MAX_PARSED_TEXT_LENGTH } from '../../../common/utils/text-limit.util'

export class UpdateResumeDto implements UpdateResumePayload {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_PARSED_TEXT_LENGTH)
  content?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  targetRole?: string

  @IsOptional()
  @IsString()
  @IsIn(['', 'junior', '1-3', '3-5', '5+'])
  experienceLevel?: string
}
