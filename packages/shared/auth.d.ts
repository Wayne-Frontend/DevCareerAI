export interface AuthUser {
  id: string
  username: string
  email: string
  profession?: string | null
  avatarUrl?: string | null
  role: string
  // 'active' | 'disabled'，disabled 用户禁止登录
  status: string
  createdAt: string
}

// —— 管理端用户管理契约 ——

export interface AdminUserItem {
  id: string
  username: string
  email: string
  role: string
  status: string
  createdAt: string
  // 该用户累计 AI token 消耗，便于管理员识别高消耗账号
  totalTokens: number
}

export interface AdminUserListResult {
  items: AdminUserItem[]
  total: number
  page: number
  pageSize: number
}

export interface UpdateUserRolePayload {
  role: 'user' | 'admin'
}

export interface UpdateUserStatusPayload {
  status: 'active' | 'disabled'
}

export interface AuthSession {
  accessToken: string
  accessTokenExpiresAt: string
  user: AuthUser
}

export interface LoginPayload {
  account: string
  password: string
  remember?: boolean
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  profession?: string
}

export interface UpdateProfilePayload {
  email: string
}
