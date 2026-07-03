import { IsEmail, MaxLength } from 'class-validator'
import type { UpdateProfilePayload } from '@devcareer/shared'

export class UpdateProfileDto implements UpdateProfilePayload {
  @IsEmail()
  @MaxLength(120)
  email: string
}
