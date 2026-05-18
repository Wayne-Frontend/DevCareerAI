import { Body, Controller, Get, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService, extractBearerToken } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { Public } from './public.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Get('me')
  me(@Req() request: Request & { user?: unknown }) {
    return request.user
  }

  @Post('logout')
  logout(@Req() request: Request) {
    return this.authService.logout(extractBearerToken(request.headers.authorization))
  }
}
