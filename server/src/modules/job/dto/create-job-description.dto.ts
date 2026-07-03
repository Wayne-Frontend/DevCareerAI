import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import type { JobDescriptionPayload } from '@devcareer/shared'
import { AI_TEXT_LIMITS } from '../../../common/utils/text-limit.util'

export class CreateJobDescriptionDto implements JobDescriptionPayload {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  jobTitle: string

  @IsString()
  @MinLength(1)
  @MaxLength(AI_TEXT_LIMITS.jobDescription)
  content: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string
}
