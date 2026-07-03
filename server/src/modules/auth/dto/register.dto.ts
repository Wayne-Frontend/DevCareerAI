import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import type { RegisterPayload } from '@devcareer/shared'

// implements 共享契约：契约改字段时此处编译期报错，防止前后端漂移。
export class RegisterDto implements RegisterPayload {
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
