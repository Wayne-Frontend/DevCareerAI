import { IsArray, IsOptional, IsString, MinLength } from 'class-validator'

export class OptimizeProjectDto {
  @IsString()
  @MinLength(1)
  rawContent: string

  @IsOptional()
  @IsString()
  targetRole?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[]

  @IsOptional()
  @IsString()
  style?: string
}
