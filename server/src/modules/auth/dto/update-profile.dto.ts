import { IsEmail, MaxLength } from 'class-validator'

export class UpdateProfileDto {
  @IsEmail()
  @MaxLength(120)
  email: string
}
