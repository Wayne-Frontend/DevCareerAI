import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'requiredRoles'

/**
 * 标记接口所需角色。未标注的接口不受 RolesGuard 影响。
 * 例：@Roles('admin')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
