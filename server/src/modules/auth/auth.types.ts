export interface AuthUserResponse {
  id: string
  username: string
  email: string
  avatarUrl?: string | null
  role: string
  createdAt: Date
}
