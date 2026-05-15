import { IsOptional, IsString, MinLength } from 'class-validator'

export class CreateInterviewDto {
  @IsString()
  @MinLength(1)
  resumeContent: string

  @IsOptional()
  @IsString()
  resumeId?: string

  @IsOptional()
  @IsString()
  jobDescription?: string

  @IsOptional()
  @IsString()
  jobDescriptionId?: string

  @IsString()
  @MinLength(1)
  targetRole: string

  @IsString()
  @MinLength(1)
  interviewType: string

  @IsString()
  @MinLength(1)
  difficulty: string
}
