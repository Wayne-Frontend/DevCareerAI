import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { ROLES_KEY } from '../../modules/auth/roles.decorator'

/**
 * 基于角色的访问控制。需注册在 AuthGuard 之后，确保 request.user 已就绪。
 * 未标注 @Roles 的接口直接放行；标注了则校验 request.user.role 是否在允许列表内。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles?.length) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request & { user?: { role?: string } }>()
    const role = request.user?.role

    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException('需要管理员权限')
    }

    return true
  }
}
