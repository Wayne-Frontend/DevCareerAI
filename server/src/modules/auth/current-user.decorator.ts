import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import type { AuthUserResponse } from './auth.types'

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUserResponse => {
  const request = context.switchToHttp().getRequest<Request & { user?: AuthUserResponse }>()

  if (!request.user) {
    throw new UnauthorizedException('请先登录')
  }

  return request.user
})
