import { equal, notEqual, ok, rejects } from 'node:assert/strict'
import { test } from 'node:test'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { createHash } from 'crypto'
import { AuthService, hashPassword } from '../src/modules/auth/auth.service'
import type { PrismaService } from '../src/prisma/prisma.service'

const config = {
  get: (key: string) =>
    ({
      JWT_ACCESS_SECRET: 'test-secret-at-least-32-characters!!',
      ACCESS_TOKEN_TTL_MINUTES: '15',
    })[key],
} as unknown as ConfigService

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    username: 'alice',
    email: 'alice@example.com',
    profession: null,
    avatarUrl: null,
    passwordHash: '',
    role: 'user',
    status: 'active',
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

test('register：空系统首个注册用户自动成为管理员', async () => {
  let createdRole = ''
  const tx = {
    user: {
      count: async () => 0,
      create: async (args: { data: { role: string } }) => {
        createdRole = args.data.role
        return buildUser({ role: args.data.role })
      },
    },
  }
  const prisma = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
    authSession: { create: async () => ({}) },
  } as unknown as PrismaService

  const service = new AuthService(prisma, config)
  const result = await service.register({
    username: 'alice',
    email: 'alice@example.com',
    password: 'password123',
  })

  equal(createdRole, 'admin')
  ok(result.session.accessToken, '应签发 access token')
  ok(result.refreshToken, '应签发 refresh token')
})

test('register：已有用户时新注册者为普通用户', async () => {
  let createdRole = ''
  const tx = {
    user: {
      count: async () => 3,
      create: async (args: { data: { role: string } }) => {
        createdRole = args.data.role
        return buildUser({ role: args.data.role })
      },
    },
  }
  const prisma = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
    authSession: { create: async () => ({}) },
  } as unknown as PrismaService

  const service = new AuthService(prisma, config)
  await service.register({ username: 'bob', email: 'bob@example.com', password: 'password123' })

  equal(createdRole, 'user')
})

test('login：密码正确但账号被禁用时拒绝签发会话', async () => {
  const passwordHash = await hashPassword('password123')
  const prisma = {
    user: {
      findFirst: async () => buildUser({ passwordHash, status: 'disabled' }),
    },
  } as unknown as PrismaService

  const service = new AuthService(prisma, config)
  await rejects(
    () => service.login({ account: 'alice', password: 'password123' }),
    ForbiddenException,
  )
})

test('refresh：轮换后签发新 refresh token 并递增版本', async () => {
  const oldToken = 'sess1.old-secret'
  const updates: Array<Record<string, unknown>> = []
  const prisma = {
    authSession: {
      findUnique: async () => ({
        id: 'sess1',
        userId: 'u1',
        refreshTokenHash: sha256(oldToken),
        refreshTokenVersion: 1,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        lastUsedAt: new Date(),
        user: buildUser(),
      }),
      update: async (args: { data: Record<string, unknown> }) => {
        updates.push(args.data)
        return {
          id: 'sess1',
          expiresAt: new Date(Date.now() + 86400000),
          user: buildUser(),
        }
      },
    },
  } as unknown as PrismaService

  const service = new AuthService(prisma, config)
  const result = await service.refresh(oldToken)

  notEqual(result.refreshToken, oldToken, '必须轮换 refresh token')
  equal(updates.length, 1)
  notEqual(updates[0].refreshTokenHash, sha256(oldToken))
})

test('refresh：token 复用（hash 不匹配）时吊销整个会话', async () => {
  const currentToken = 'sess1.current-secret'
  const stolenOldToken = 'sess1.stolen-old-secret'
  let revoked = false
  const prisma = {
    authSession: {
      findUnique: async () => ({
        id: 'sess1',
        userId: 'u1',
        refreshTokenHash: sha256(currentToken),
        refreshTokenVersion: 2,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        lastUsedAt: new Date(),
        user: buildUser(),
      }),
      updateMany: async () => {
        revoked = true
        return { count: 1 }
      },
    },
  } as unknown as PrismaService

  const service = new AuthService(prisma, config)
  await rejects(() => service.refresh(stolenOldToken), UnauthorizedException)
  equal(revoked, true, '检测到复用应吊销会话')
})

test('refresh：已过期会话拒绝刷新', async () => {
  const token = 'sess1.secret'
  const prisma = {
    authSession: {
      findUnique: async () => ({
        id: 'sess1',
        userId: 'u1',
        refreshTokenHash: sha256(token),
        refreshTokenVersion: 0,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        lastUsedAt: new Date(),
        user: buildUser(),
      }),
    },
  } as unknown as PrismaService

  const service = new AuthService(prisma, config)
  await rejects(() => service.refresh(token), UnauthorizedException)
})

test('changePassword：验旧密码、更新哈希并吊销其他会话', async () => {
  const passwordHash = await hashPassword('oldPassword1')
  let updatedData: Record<string, unknown> | null = null
  let revokeWhere: Record<string, unknown> | null = null
  const prisma = {
    user: {
      findUnique: async () => buildUser({ passwordHash, mustChangePassword: true }),
      update: async (args: { data: Record<string, unknown> }) => {
        updatedData = args.data
        return buildUser()
      },
    },
    authSession: {
      updateMany: async (args: { where: Record<string, unknown> }) => {
        revokeWhere = args.where
        return { count: 2 }
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService

  const service = new AuthService(prisma, config)
  const result = await service.changePassword('u1', '', {
    oldPassword: 'oldPassword1',
    newPassword: 'newPassword2',
  })

  equal(result.success, true)
  ok(updatedData, '应更新用户')
  equal((updatedData as unknown as { mustChangePassword: boolean }).mustChangePassword, false)
  notEqual((updatedData as unknown as { passwordHash: string }).passwordHash, passwordHash)
  ok(revokeWhere, '应吊销其他会话')
  equal((revokeWhere as unknown as { userId: string }).userId, 'u1')
})

test('changePassword：旧密码错误时拒绝', async () => {
  const passwordHash = await hashPassword('correctOld1')
  const prisma = {
    user: { findUnique: async () => buildUser({ passwordHash }) },
  } as unknown as PrismaService

  const service = new AuthService(prisma, config)
  await rejects(
    () =>
      service.changePassword('u1', '', {
        oldPassword: 'wrongOld1',
        newPassword: 'newPassword2',
      }),
    UnauthorizedException,
  )
})
