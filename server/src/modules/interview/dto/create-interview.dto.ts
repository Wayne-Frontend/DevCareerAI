import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { AI_TEXT_LIMITS } from '../../../common/utils/text-limit.util'

export class CreateInterviewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  resumeContent: string

  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{8,}$/)
  resumeId?: string

  @IsOptional()
  @IsString()
  @MaxLength(AI_TEXT_LIMITS.jobDescription)
  jobDescription?: string

  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{8,}$/)
  jobDescriptionId?: string

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  targetRole: string

  @IsString()
  @MinLength(1)
  @IsIn(['项目面试', '技术面', '综合面'])
  interviewType: string

  @IsString()
  @MinLength(1)
  @IsIn(['简单', '中等', '困难'])
  difficulty: string
}
