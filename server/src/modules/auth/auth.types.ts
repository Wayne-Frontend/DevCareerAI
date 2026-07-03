import type { AuthUser } from '@devcareer/shared'

// 服务端内部持有 Date，JSON 序列化后即为共享契约里的 string；
// 通过 Omit + 收窄绑定共享契约，契约字段变更时此处编译期报错。
export interface AuthUserResponse extends Omit<AuthUser, 'createdAt'> {
  createdAt: Date
}
