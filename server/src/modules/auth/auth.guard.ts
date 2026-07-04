import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { AuthService, extractBearerToken } from './auth.service'
import { IS_PUBLIC_ROUTE } from './public.decorator'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: unknown; authToken?: string }>()
    const accessToken = extractBearerToken(request.headers.authorization)

    if (!accessToken) {
      throw new UnauthorizedException('请先登录')
    }

    const session = await this.authService.findSession(accessToken)

    if (!session) {
      throw new UnauthorizedException('登录状态已失效，请重新登录')
    }

    // 管理员重置密码后必须先改密：临时密码为管理员可见，改密前只放行改密/查询自身/登出。
    if (session.user.mustChangePassword && !isAllowedBeforePasswordChange(request)) {
      throw new ForbiddenException('管理员已重置你的密码，请先修改密码后再继续使用')
    }

    request.user = this.authService.toUserResponse(session.user)
    request.authToken = accessToken

    return true
  }
}

const PASSWORD_CHANGE_ALLOWLIST = new Set([
  'PATCH /api/auth/password',
  'GET /api/auth/me',
  'POST /api/auth/logout',
])

function isAllowedBeforePasswordChange(request: Request) {
  const path = (request.baseUrl || '') + (request.path || '')
  return PASSWORD_CHANGE_ALLOWLIST.has(`${request.method} ${path}`)
}
