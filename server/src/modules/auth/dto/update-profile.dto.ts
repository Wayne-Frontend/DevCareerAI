import { IsEmail, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator'

export class UpdateProfileDto {
  @IsEmail()
  @MaxLength(120)
  email: string

  @ValidateIf((_dto, value) => value !== undefined && value !== null && value !== '')
  @IsString()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  avatarUrl?: string | null
}
