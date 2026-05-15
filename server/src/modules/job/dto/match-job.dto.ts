import { IsOptional, IsString, MinLength } from 'class-validator'

export class MatchJobDto {
  @IsString()
  @MinLength(1)
  resumeContent: string

  @IsOptional()
  @IsString()
  resumeId?: string

  @IsString()
  @MinLength(1)
  jobTitle: string

  @IsString()
  @MinLength(1)
  jobDescription: string

  @IsOptional()
  @IsString()
  companyName?: string
}
