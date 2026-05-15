import { IsOptional, IsString, MinLength } from 'class-validator'

export class CreateResumeDto {
  @IsString()
  @MinLength(1)
  title: string

  @IsString()
  @MinLength(1)
  content: string

  @IsOptional()
  @IsString()
  targetRole?: string

  @IsOptional()
  @IsString()
  experienceLevel?: string
}
