import { IsIn } from 'class-validator'
import type { UpdateUserStatusPayload } from '@devcareer/shared'

export class UpdateUserStatusDto implements UpdateUserStatusPayload {
  @IsIn(['active', 'disabled'])
  status: 'active' | 'disabled'
}
