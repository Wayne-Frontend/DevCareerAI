import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
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
    const token = extractBearerToken(request.headers.authorization)

    if (!token) {
      throw new UnauthorizedException('请先登录')
    }

    const session = await this.authService.findSession(token)

    if (!session) {
      throw new UnauthorizedException('登录状态已失效，请重新登录')
    }

    request.user = this.authService.toUserResponse(session.user)
    request.authToken = token

    return true
  }
}
