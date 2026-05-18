export interface AuthUser {
  id: string
  username: string
  email: string
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
