import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { Prisma, User } from '@prisma/client'
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto'
import { PrismaService } from '../../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import type { AuthUserResponse } from './auth.types'

const PASSWORD_KEY_LENGTH = 64
const TOKEN_BYTES = 32
const ONE_DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const email = normalizeAccount(dto.email)
    const username = dto.username.trim()

    try {
      const user = await this.prisma.user.create({
        data: {
          username,
          email,
          passwordHash: hashPassword(dto.password),
        },
      })

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

    return this.createAuthResponse(user, Boolean(dto.remember))
  }

  async findSession(token: string) {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    })

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return null
    }

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    })

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

    const avatarUrl = dto.avatarUrl?.trim() || null
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { email, avatarUrl },
    })

    return this.toUserResponse(user)
  }

  toUserResponse(user: Pick<User, 'id' | 'username' | 'email' | 'avatarUrl' | 'createdAt'>): AuthUserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
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

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex')

  return `scrypt$${salt}$${key}`
}

function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, key] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !key) return false

  const candidate = Buffer.from(scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex'), 'hex')
  const expected = Buffer.from(key, 'hex')

  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
