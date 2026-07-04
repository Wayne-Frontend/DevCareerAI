import { request } from './request'
import type {
  AuthSession,
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '@/types/auth'

export function login(data: LoginPayload) {
  return request<AuthSession>({
    url: '/auth/login',
    method: 'POST',
    data,
  })
}

export function register(data: RegisterPayload) {
  return request<AuthSession>({
    url: '/auth/register',
    method: 'POST',
    data,
  })
}

export function getCurrentUser() {
  return request<AuthUser>({
    url: '/auth/me',
    method: 'GET',
  })
}

export function updateProfile(data: UpdateProfilePayload) {
  return request<AuthUser>({
    url: '/auth/me',
    method: 'PATCH',
    data,
  })
}

export function changePassword(data: ChangePasswordPayload) {
  return request<{ success: boolean }>({
    url: '/auth/password',
    method: 'PATCH',
    data,
  })
}

export function uploadAvatar(file: File) {
  const data = new FormData()
  data.append('avatar', file)

  return request<AuthUser>({
    url: '/auth/me/avatar',
    method: 'POST',
    data,
  })
}

export function logout() {
  return request<{ success: boolean }>({
    url: '/auth/logout',
    method: 'POST',
  })
}
