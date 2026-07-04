import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
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

  // 密码策略仅约束新注册（LoginDto 保持 6 位下限，存量老密码账号仍可登录）。
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: '密码需同时包含字母和数字' })
  password: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  profession?: string
}
