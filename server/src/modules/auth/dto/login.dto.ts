import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import type { LoginPayload } from '@devcareer/shared'

export class LoginDto implements LoginPayload {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  account: string

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string

  @IsOptional()
  @IsBoolean()
  remember?: boolean
}
