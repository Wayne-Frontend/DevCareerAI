import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_\u4e00-\u9fa5-]+$/)
  username: string

  @IsEmail()
  @MaxLength(120)
  email: string

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string
}
