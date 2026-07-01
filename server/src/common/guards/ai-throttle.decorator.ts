import { Throttle } from '@nestjs/throttler'

// AI 生成类接口的限流：每分钟 10 次（全局基础限制为 60 次/分钟）。
export const AiThrottle = () => Throttle({ default: { limit: 10, ttl: 60000 } })
