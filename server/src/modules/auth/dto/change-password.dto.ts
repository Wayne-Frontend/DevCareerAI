import { IsString, Matches, MaxLength, MinLength } from 'class-validator'
import type { ChangePasswordPayload } from '@devcareer/shared'

// implements 共享契约：契约改字段时此处编译期报错，防止前后端漂移。
export class ChangePasswordDto implements ChangePasswordPayload {
  // 旧密码只做存在性校验（存量老密码可能不满足新策略，下限与 LoginDto 一致）。
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  oldPassword: string

  // 新密码执行与注册一致的强度策略。
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: '密码需同时包含字母和数字' })
  newPassword: string
}
