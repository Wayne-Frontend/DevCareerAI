import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { Prisma, User } from '@prisma/client'
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { join } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { detectImageMime, type ImageMimeType } from '../../common/utils/file-signature.util'
import { PrismaService } from '../../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import type { AuthUserResponse } from './auth.types'

const PASSWORD_KEY_LENGTH = 64
const TOKEN_BYTES = 32
const ONE_DAY_MS = 24 * 60 * 60 * 1000
// 仅在距上次活跃超过该间隔时才刷新 lastUsedAt，避免每个鉴权请求都写一次库。
const LAST_USED_THROTTLE_MS = 10 * 60 * 1000
const AVATAR_MAX_SIZE = 5 * 1024 * 1024
const AVATAR_UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars')
const AVATAR_EXTENSIONS: Record<ImageMimeType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const email = normalizeAccount(dto.email)
    const username = dto.username.trim()

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // 空系统里的首个注册用户自动成为管理员（first-run 引导，只发生一次）。
        // SQLite 写事务串行化，并发注册不会同时读到 0，无需额外加锁；此后永不再从任何字段反推 role。
        const isFirstUser = (await tx.user.count()) === 0

        return tx.user.create({
          data: {
            username,
            email,
            passwordHash: hashPassword(dto.password),
            role: isFirstUser ? 'admin' : 'user',
          },
        })
      })

      if (user.role === 'admin') {
        this.logger.log(`已将首个注册用户 ${user.username} 设为管理员`)
      }

      return this.createAuthResponse(user, true)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('用户名或邮箱已被注册')
      }

      throw error
    }
  }

  async login(dto: LoginDto) {
    const account = normalizeAccount(dto.account)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: account }, { username: dto.account.trim() }],
      },
    })

    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('账号或密码不正确')
    }

    // 密码正确但账号被禁用：拒绝签发会话。放在验密之后，避免用状态差异探测账号是否存在。
    if (user.status === 'disabled') {
      throw new ForbiddenException('账号已被禁用，请联系管理员')
    }

    return this.createAuthResponse(user, Boolean(dto.remember))
  }

  async findSession(token: string) {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    })

    const now = Date.now()
    if (!session || session.expiresAt.getTime() <= now) {
      return null
    }

    // 存量会话的即时吊销：封禁时虽已删除其 AuthSession，这里对残留会话再兜一层，
    // 确保被禁用账号在任何路径下都无法通过鉴权。
    if (session.user.status === 'disabled') {
      return null
    }

    if (now - session.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date(now) },
      })
    }

    return session
  }

  async logout(token: string) {
    await this.prisma.authSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    })

    return { success: true }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const email = normalizeAccount(dto.email)
    const duplicatedUser = await this.prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
      select: { id: true },
    })

    if (duplicatedUser) {
      throw new ConflictException('邮箱已被使用')
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { email },
    })

    return this.toUserResponse(user)
  }

  async updateAvatar(userId: string, file: Express.Multer.File | undefined, requestOrigin: string) {
    if (!file) {
      throw new BadRequestException('请选择要上传的头像图片')
    }

    if (file.size > AVATAR_MAX_SIZE) {
      throw new BadRequestException('头像大小不能超过 5MB')
    }

    // 客户端上报的 mimetype 可伪造，以文件头魔数探测出的真实类型为准。
    const detectedMime = detectImageMime(file.buffer)
    if (!detectedMime) {
      throw new BadRequestException('头像仅支持 JPG、PNG、WebP 或 GIF 图片')
    }

    await mkdir(AVATAR_UPLOAD_DIR, { recursive: true })

    const extension = AVATAR_EXTENSIONS[detectedMime]
    const fileName = `${userId}-${Date.now()}-${randomBytes(8).toString('hex')}${extension}`
    await writeFile(join(AVATAR_UPLOAD_DIR, fileName), file.buffer)

    const avatarUrl = `${requestOrigin}/uploads/avatars/${fileName}`
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    })

    return this.toUserResponse(user)
  }

  toUserResponse(
    user: Pick<User, 'id' | 'username' | 'email' | 'avatarUrl' | 'role' | 'status' | 'createdAt'>,
  ): AuthUserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    }
  }

  private async createAuthResponse(user: User, remember: boolean) {
    const token = randomBytes(TOKEN_BYTES).toString('base64url')
    const expiresAt = new Date(Date.now() + (remember ? 30 : 1) * ONE_DAY_MS)

    await this.prisma.authSession.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt,
      },
    })

    return {
      token,
      expiresAt,
      user: this.toUserResponse(user),
    }
  }
}

export function extractBearerToken(header?: string) {
  if (!header?.startsWith('Bearer ')) return ''
  return header.slice('Bearer '.length).trim()
}

function normalizeAccount(value: string) {
  return value.trim().toLowerCase()
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex')

  return `scrypt$${salt}$${key}`
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, key] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !key) return false

  const candidate = Buffer.from(
    scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex'),
    'hex',
  )
  const expected = Buffer.from(key, 'hex')

  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
