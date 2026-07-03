import { IsOptional, IsString, Matches } from 'class-validator'
import type { CreateChatSessionPayload } from '@devcareer/shared'

export class CreateChatSessionDto implements CreateChatSessionPayload {
  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{8,}$/)
  resumeId?: string

  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{8,}$/)
  jobDescriptionId?: string
}
