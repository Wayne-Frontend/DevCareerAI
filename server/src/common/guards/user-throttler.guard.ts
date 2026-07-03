import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

/**
 * 从请求解析限流计数维度：优先用登录用户 id，未登录（如登录/注册接口）时退回到 IP。
 * 抽成纯函数以便单测。
 */
export function resolveThrottleTracker(req: {
  user?: { id?: string }
  ips?: string[]
  ip?: string
}): string {
  const userId = req.user?.id

  if (userId) {
    return `user:${userId}`
  }

  return req.ips?.length ? req.ips[0] : req.ip || 'unknown'
}

/**
 * 按用户限流。需注册在 AuthGuard 之后，确保 request.user 已就绪。
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  // 基类签名是 Record<string, any>，这里收窄为实际读取的字段（方法参数双变，覆写合法）。
  protected async getTracker(req: {
    user?: { id?: string }
    ips?: string[]
    ip?: string
  }): Promise<string> {
    return resolveThrottleTracker(req)
  }
}
