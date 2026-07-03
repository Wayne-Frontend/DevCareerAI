import { request } from './request'
import type { AdminUserItem, AdminUserListResult } from '@/types/auth'

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

export function updateUserStatus(id: string, status: 'active' | 'disabled') {
  return request<AdminUserItem>({
    url: `/admin/users/${id}/status`,
    method: 'PATCH',
    data: { status },
  })
}
