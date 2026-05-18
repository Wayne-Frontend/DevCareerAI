import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { AI_TEXT_LIMITS } from '../../../common/utils/text-limit.util'

export class MatchJobDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  resumeContent: string

  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{8,}$/)
  resumeId?: string

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  jobTitle: string

  @IsString()
  @MinLength(1)
  @MaxLength(AI_TEXT_LIMITS.jobDescription)
  jobDescription: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string
}
