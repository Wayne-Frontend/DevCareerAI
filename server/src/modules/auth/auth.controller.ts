import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'
import { AuthService, extractBearerToken } from './auth.service'
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
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
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

  @ApiBearerAuth()
  @Post('logout')
  logout(@Req() request: Request) {
    return this.authService.logout(extractBearerToken(request.headers.authorization))
  }
}
