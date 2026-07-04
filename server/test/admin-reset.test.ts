import { equal, match, notEqual, ok, rejects } from 'node:assert/strict'
import { test } from 'node:test'
import { ForbiddenException } from '@nestjs/common'
import { AdminUserService } from '../src/modules/admin/admin-user.service'
import type { PrismaService } from '../src/prisma/prisma.service'

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u2',
    username: 'bob',
    email: 'bob@example.com',
    role: 'user',
    status: 'active',
    createdAt: new Date(),
    ...overrides,
  }
}

test('resetPassword：生成临时密码、置 mustChangePassword、清空目标用户会话', async () => {
  let updatedData: Record<string, unknown> | null = null
  let deletedSessions = false
  const prisma = {
    user: {
      findUnique: async () => buildUser(),
      update: async (args: { data: Record<string, unknown> }) => {
        updatedData = args.data
        return buildUser()
      },
    },
    authSession: {
      deleteMany: async () => {
        deletedSessions = true
        return { count: 1 }
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService

  const service = new AdminUserService(prisma)
  const result = await service.resetPassword('u2', 'admin1')

  // 临时密码满足密码策略：12 位、含字母和数字
  equal(result.tempPassword.length, 12)
  match(result.tempPassword, /[a-zA-Z]/)
  match(result.tempPassword, /\d/)
  ok(updatedData, '应更新用户')
  equal((updatedData as unknown as { mustChangePassword: boolean }).mustChangePassword, true)
  ok(deletedSessions, '应清空目标用户全部会话')
})

test('resetPassword：不能重置自己（应走自助改密）', async () => {
  const prisma = {
    user: { findUnique: async () => buildUser({ id: 'admin1', role: 'admin' }) },
  } as unknown as PrismaService

  const service = new AdminUserService(prisma)
  await rejects(() => service.resetPassword('admin1', 'admin1'), ForbiddenException)
})

test('resetPassword：不能重置其他管理员', async () => {
  const prisma = {
    user: { findUnique: async () => buildUser({ id: 'admin2', role: 'admin' }) },
  } as unknown as PrismaService

  const service = new AdminUserService(prisma)
  await rejects(() => service.resetPassword('admin2', 'admin1'), ForbiddenException)
})

test('resetPassword：连续生成的临时密码不重复', async () => {
  const prisma = {
    user: {
      findUnique: async () => buildUser(),
      update: async () => buildUser(),
    },
    authSession: { deleteMany: async () => ({ count: 0 }) },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService

  const service = new AdminUserService(prisma)
  const a = await service.resetPassword('u2', 'admin1')
  const b = await service.resetPassword('u2', 'admin1')
  notEqual(a.tempPassword, b.tempPassword)
})
