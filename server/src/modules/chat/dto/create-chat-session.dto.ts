import { IsOptional, IsString, Matches } from 'class-validator'

export class CreateChatSessionDto {
  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{8,}$/)
  resumeId?: string

  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{8,}$/)
  jobDescriptionId?: string
}
