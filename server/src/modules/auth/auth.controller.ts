import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { CookieOptions, Request, Response } from 'express'
import {
  AuthService,
  extractBearerToken,
  extractCookieValue,
  REFRESH_TOKEN_COOKIE,
} from './auth.service'
import type { AuthUserResponse } from './auth.types'
import { CurrentUser } from './current-user.decorator'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { Public } from './public.decorator'

const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 登录/注册为公开接口，按 IP 严格限流（每分钟 5 次），防止暴力破解密码和批量注册。
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(dto)
    setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt)
    return result.session
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto)
    setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt)
    return result.session
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = extractCookieValue(request.headers.cookie, REFRESH_TOKEN_COOKIE)
    const result = await this.authService.refresh(refreshToken)
    setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt)
    return result.session
  }

  @ApiBearerAuth()
  @Get('me')
  me(@Req() request: Request & { user?: unknown }) {
    return request.user
  }

  @ApiBearerAuth()
  @Patch('me')
  updateMe(@CurrentUser() user: AuthUserResponse, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto)
  }

  @ApiBearerAuth()
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const accepted = AVATAR_MIME_TYPES.has(file.mimetype)
        callback(
          accepted ? null : new BadRequestException('头像仅支持 JPG、PNG、WebP 或 GIF 图片'),
          accepted,
        )
      },
    }),
  )
  uploadAvatar(@CurrentUser() user: AuthUserResponse, @UploadedFile() file: Express.Multer.File) {
    return this.authService.updateAvatar(user.id, file)
  }

  @Public()
  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = extractCookieValue(request.headers.cookie, REFRESH_TOKEN_COOKIE)
    const accessToken = extractBearerToken(request.headers.authorization)
    const result = await this.authService.logout(refreshToken, accessToken)
    clearRefreshCookie(response)
    return result
  }
}

function setRefreshCookie(response: Response, token: string, expiresAt: Date) {
  response.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...getRefreshCookieOptions(),
    expires: expiresAt,
  })
}

function clearRefreshCookie(response: Response) {
  response.clearCookie(REFRESH_TOKEN_COOKIE, getRefreshCookieOptions())
}

function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  }
}
