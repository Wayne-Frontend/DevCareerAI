import { IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator'
import type { UpdateChatSessionPayload } from '@devcareer/shared'

export class UpdateChatSessionDto implements UpdateChatSessionPayload {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title?: string

  // 传 null 表示取消勾选该上下文；不传表示保持不变。
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(/^c[a-z0-9]{8,}$/)
  resumeId?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(/^c[a-z0-9]{8,}$/)
  jobDescriptionId?: string | null
}
