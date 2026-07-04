import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Prisma, User } from '@prisma/client'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import { promisify } from 'util'
import { sign, verify, type JwtPayload } from 'jsonwebtoken'
import type { AuthSession as AuthSessionContract } from '@devcareer/shared'
import { detectImageMime, type ImageMimeType } from '../../common/utils/file-signature.util'
import { PrismaService } from '../../prisma/prisma.service'
import type { AuthUserResponse } from './auth.types'
import { ChangePasswordDto } from './dto/change-password.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'

const PASSWORD_KEY_LENGTH = 64
const REFRESH_TOKEN_BYTES = 32
const SESSION_ID_BYTES = 16
const JWT_ID_BYTES = 16
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_ACCESS_TOKEN_TTL_MINUTES = 15
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

export const REFRESH_TOKEN_COOKIE = 'devcareer_refresh_token'

interface AccessTokenClaims extends JwtPayload {
  sub: string
  sid: string
}

interface AuthResponseWithRefresh {
  session: AuthSessionContract
  refreshToken: string
  refreshExpiresAt: Date
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseWithRefresh> {
    const email = normalizeAccount(dto.email)
    const username = dto.username.trim()
    const profession = dto.profession?.trim() || null

    // scrypt 成本较高，放在事务外计算，避免拉长数据库事务。
    const passwordHash = await hashPassword(dto.password)

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // 空系统里首个注册用户自动成为管理员，仅发生一次。
        const isFirstUser = (await tx.user.count()) === 0

        return tx.user.create({
          data: {
            username,
            email,
            profession,
            passwordHash,
            role: isFirstUser ? 'admin' : 'user',
          },
        })
      })

      if (user.role === 'admin') {
        this.logger.log(`已将首个注册用户 ${user.username} 设为管理员`)
      }

      return this.createAuthResponse(user, Boolean(dto.remember))
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('用户名或邮箱已被注册')
      }

      throw error
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseWithRefresh> {
    const account = normalizeAccount(dto.account)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: account }, { username: dto.account.trim() }],
      },
    })

    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('账号或密码不正确')
    }

    // 密码正确但账号被禁用：拒绝签发会话，同时避免在验密前暴露账号状态差异。
    if (user.status === 'disabled') {
      throw new ForbiddenException('账号已被禁用，请联系管理员')
    }

    return this.createAuthResponse(user, Boolean(dto.remember))
  }

  async refresh(refreshToken: string): Promise<AuthResponseWithRefresh> {
    const session = await this.requireRefreshSession(refreshToken)
    const nextRefreshToken = createRefreshToken(session.id)
    const now = new Date()

    const updatedSession = await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: hashToken(nextRefreshToken),
        refreshTokenVersion: { increment: 1 },
        lastUsedAt: now,
      },
      include: { user: true },
    })

    return {
      session: this.createAccessSession(updatedSession.user, updatedSession.id),
      refreshToken: nextRefreshToken,
      refreshExpiresAt: updatedSession.expiresAt,
    }
  }

  async findSession(accessToken: string) {
    const claims = this.verifyAccessToken(accessToken)
    if (!claims) return null

    const session = await this.prisma.authSession.findUnique({
      where: { id: claims.sid },
      include: { user: true },
    })

    const now = Date.now()
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now ||
      session.user.status === 'disabled'
    ) {
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

  async logout(refreshToken: string, accessToken = '') {
    const parsed = parseRefreshToken(refreshToken)
    const now = new Date()

    if (parsed) {
      const result = await this.prisma.authSession.updateMany({
        where: {
          id: parsed.sessionId,
          refreshTokenHash: hashToken(refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: now },
      })

      if (result.count > 0) {
        return { success: true }
      }
    }

    const claims = accessToken ? this.verifyAccessToken(accessToken, true) : null
    if (claims) {
      await this.prisma.authSession.updateMany({
        where: { id: claims.sid, userId: claims.sub, revokedAt: null },
        data: { revokedAt: now },
      })
    }

    return { success: true }
  }

  /**
   * 自助修改密码：验旧密码 → 更新哈希 → 吊销该用户除当前会话外的所有会话
   * （改密的核心安全语义：让可能已窃取旧密码/会话的一方立即失效）。
   */
  async changePassword(userId: string, accessToken: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || !(await verifyPassword(dto.oldPassword, user.passwordHash))) {
      throw new UnauthorizedException('当前密码不正确')
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('新密码不能与当前密码相同')
    }

    const passwordHash = await hashPassword(dto.newPassword)
    const claims = this.verifyAccessToken(accessToken)
    const now = new Date()

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      this.prisma.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
          ...(claims ? { NOT: { id: claims.sid } } : {}),
        },
        data: { revokedAt: now },
      }),
    ])

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

  async updateAvatar(userId: string, file: Express.Multer.File | undefined) {
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

    const previousUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    })
    const avatarUrl = `/uploads/avatars/${fileName}`
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    })

    await this.removeAvatarFile(previousUser?.avatarUrl)

    return this.toUserResponse(user)
  }

  // 删除被替换的旧头像文件，只取 basename 并限定在头像目录内，避免异常历史值误删任意文件。
  private async removeAvatarFile(avatarUrl: string | null | undefined) {
    if (!avatarUrl || !avatarUrl.includes('/uploads/avatars/')) return

    const fileName = basename(avatarUrl)
    if (!fileName) return

    try {
      await unlink(join(AVATAR_UPLOAD_DIR, fileName))
    } catch (error) {
      this.logger.warn(
        `旧头像文件删除失败：${fileName}，${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  toUserResponse(
    user: Pick<
      User,
      | 'id'
      | 'username'
      | 'email'
      | 'profession'
      | 'avatarUrl'
      | 'role'
      | 'status'
      | 'mustChangePassword'
      | 'createdAt'
    >,
  ): AuthUserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      profession: user.profession,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
    }
  }

  private async createAuthResponse(
    user: User,
    remember: boolean,
  ): Promise<AuthResponseWithRefresh> {
    const sessionId = randomBytes(SESSION_ID_BYTES).toString('hex')
    const refreshToken = createRefreshToken(sessionId)
    const refreshExpiresAt = new Date(Date.now() + (remember ? 30 : 1) * ONE_DAY_MS)

    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        refreshTokenHash: hashToken(refreshToken),
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    })

    return {
      session: this.createAccessSession(user, sessionId),
      refreshToken,
      refreshExpiresAt,
    }
  }

  private createAccessSession(user: User, sessionId: string): AuthSessionContract {
    const now = Date.now()
    const accessTokenExpiresAt = new Date(now + this.getAccessTokenTtlMs())
    const accessToken = sign(
      {
        sub: user.id,
        sid: sessionId,
      },
      this.getAccessSecret(),
      {
        expiresIn: Math.floor(this.getAccessTokenTtlMs() / 1000),
        jwtid: randomBytes(JWT_ID_BYTES).toString('hex'),
      },
    )

    return {
      accessToken,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      user: serializeAuthUser(this.toUserResponse(user)),
    }
  }

  private async requireRefreshSession(refreshToken: string) {
    const parsed = parseRefreshToken(refreshToken)
    if (!parsed) {
      throw new UnauthorizedException('登录状态已失效，请重新登录')
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: parsed.sessionId },
      include: { user: true },
    })
    const now = Date.now()

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now ||
      session.user.status === 'disabled'
    ) {
      throw new UnauthorizedException('登录状态已失效，请重新登录')
    }

    if (session.refreshTokenHash !== hashToken(refreshToken)) {
      await this.prisma.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      throw new UnauthorizedException('登录状态已失效，请重新登录')
    }

    return session
  }

  private verifyAccessToken(
    accessToken: string,
    ignoreExpiration = false,
  ): AccessTokenClaims | null {
    try {
      const payload = verify(accessToken, this.getAccessSecret(), { ignoreExpiration })
      if (!isAccessTokenClaims(payload)) return null
      return payload
    } catch {
      return null
    }
  }

  private getAccessSecret() {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET')?.trim()
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET 未配置')
    }
    return secret
  }

  private getAccessTokenTtlMs() {
    const raw = this.configService.get<string | number>('ACCESS_TOKEN_TTL_MINUTES')
    const minutes = Number(raw || DEFAULT_ACCESS_TOKEN_TTL_MINUTES)
    const safeMinutes =
      Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_ACCESS_TOKEN_TTL_MINUTES
    return safeMinutes * 60 * 1000
  }
}

export function extractBearerToken(header?: string) {
  if (!header?.startsWith('Bearer ')) return ''
  return header.slice('Bearer '.length).trim()
}

export function extractCookieValue(header: string | undefined, name: string) {
  if (!header) return ''

  const item = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))

  if (!item) return ''

  const value = item.slice(name.length + 1)
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function createRefreshToken(sessionId: string) {
  return `${sessionId}.${randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')}`
}

function parseRefreshToken(token: string) {
  const [sessionId, secret, ...rest] = token.split('.')
  if (!sessionId || !secret || rest.length > 0) return null
  return { sessionId, secret }
}

function normalizeAccount(value: string) {
  return value.trim().toLowerCase()
}

const scryptAsync = promisify<string, string, number, Buffer>(scrypt)

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const key = (await scryptAsync(password, salt, PASSWORD_KEY_LENGTH)).toString('hex')

  return `scrypt$${salt}$${key}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, key] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !key) return false

  const candidate = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH)
  const expected = Buffer.from(key, 'hex')

  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function isAccessTokenClaims(value: string | JwtPayload): value is AccessTokenClaims {
  return typeof value !== 'string' && typeof value.sub === 'string' && typeof value.sid === 'string'
}

function serializeAuthUser(user: AuthUserResponse): AuthSessionContract['user'] {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  }
}
