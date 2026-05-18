export interface AuthUser {
  id: string
  username: string
  email: string
  avatarUrl?: string | null
  createdAt: string
}

export interface AuthSession {
  token: string
  expiresAt: string
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
}

export interface UpdateProfilePayload {
  email: string
  avatarUrl?: string | null
}
