import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService, extractBearerToken } from './auth.service'
import type { AuthUserResponse } from './auth.types'
import { CurrentUser } from './current-user.decorator'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
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

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUserResponse, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto)
  }

  @Post('logout')
  logout(@Req() request: Request) {
    return this.authService.logout(extractBearerToken(request.headers.authorization))
  }
}
