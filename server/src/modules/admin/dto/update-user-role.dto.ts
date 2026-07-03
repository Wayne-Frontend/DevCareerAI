import { IsIn } from 'class-validator'
import type { UpdateUserRolePayload } from '@devcareer/shared'

export class UpdateUserRoleDto implements UpdateUserRolePayload {
  @IsIn(['user', 'admin'])
  role: 'user' | 'admin'
}
