import { request } from './request'
import type { AdminResetPasswordResult, AdminUserItem, AdminUserListResult } from '@/types/auth'

interface AdminUserQuery {
  page?: number
  pageSize?: number
  keyword?: string
}

// 以下接口均要求管理员权限（后端 @Roles('admin')）。

export function getAdminUsers(params: AdminUserQuery = {}) {
  return request<AdminUserListResult>({
    url: '/admin/users',
    method: 'GET',
    params,
  })
}

export function updateUserRole(id: string, role: 'user' | 'admin') {
  return request<AdminUserItem>({
    url: `/admin/users/${id}/role`,
    method: 'PATCH',
    data: { role },
  })
}

// 重置密码：响应中的临时密码仅出现一次，展示后不再可查。
export function resetUserPassword(id: string) {
  return request<AdminResetPasswordResult>({
    url: `/admin/users/${id}/password-reset`,
    method: 'POST',
  })
}

export function updateUserStatus(id: string, status: 'active' | 'disabled') {
  return request<AdminUserItem>({
    url: `/admin/users/${id}/status`,
    method: 'PATCH',
    data: { status },
  })
}
