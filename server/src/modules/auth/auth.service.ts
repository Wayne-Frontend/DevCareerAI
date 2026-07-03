import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { Prisma, User } from '@prisma/client'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { basename, join } from 'path'
import { promisify } from 'util'
import { mkdir, unlink, writeFile } from 'fs/promises'
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

    // 哈希放在事务外算好：scrypt 需要上百毫秒，不应占用 SQLite 的串行写事务窗口。
    const passwordHash = await hashPassword(dto.password)

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // 空系统里的首个注册用户自动成为管理员（first-run 引导，只发生一次）。
        // SQLite 写事务串行化，并发注册不会同时读到 0，无需额外加锁；此后永不再从任何字段反推 role。
        const isFirstUser = (await tx.user.count()) === 0

        return tx.user.create({
          data: {
            username,
            email,
            passwordHash,
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

    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
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

    // 只存相对路径：换域名/端口后头像不失效，也杜绝伪造 Host 头污染存储 URL。
    // 前端负责按 API origin 拼接完整地址（同时兼容存量的绝对 URL 数据）。
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

  // 删除被替换的旧头像文件，避免磁盘无限增长。
  // 只取 basename 并限定在头像目录内，防止库里存了异常值时被诱导删除任意文件；
  // 删除失败（文件不存在、被占用）不影响主流程。
  private async removeAvatarFile(avatarUrl: string | null | undefined) {
    if (!avatarUrl || !avatarUrl.includes('/uploads/avatars/')) return

    const fileName = basename(avatarUrl)
    if (!fileName) return

    try {
      await unlink(join(AVATAR_UPLOAD_DIR, fileName))
    } catch (error) {
      this.logger.warn(
        `旧头像文件删除失败：${fileName}（${error instanceof Error ? error.message : String(error)}）`,
      )
    }
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

// scrypt 计算量大（有意为之），必须走异步版本，避免注册/登录时阻塞事件循环拖垮全部请求。
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
