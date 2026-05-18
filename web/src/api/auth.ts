import { request } from './request'
import type { AuthSession, AuthUser, LoginPayload, RegisterPayload, UpdateProfilePayload } from '../types/auth'

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

export function logout() {
  return request<{ success: boolean }>({
    url: '/auth/logout',
    method: 'POST',
  })
}
