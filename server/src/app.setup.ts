import { INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiExceptionFilter } from './common/filters/api-exception.filter'

/**
 * 应用级管道配置：全局前缀、异常过滤器、CORS、校验管道。
 * 抽出为独立函数供 bootstrap 与 e2e 测试共用——e2e 必须复刻与线上完全一致的请求管道，
 * 否则测到的行为（前缀、400 语义、序列化）与生产不符。
 */
export function setupApp(app: INestApplication) {
  const configService = app.get(ConfigService)

  app.setGlobalPrefix('api')
  app.useGlobalFilters(new ApiExceptionFilter())
  // 跨域白名单：生产环境必须显式配置 CORS_ORIGIN（逗号分隔），未配置时不放行任何跨域请求
  //（经 nginx 反代的同源部署不受影响）；开发环境未配置时放行任意来源，便于本地联调。
  app.enableCors({
    origin: resolveCorsOrigins(configService.get<string>('CORS_ORIGIN')),
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // 未在 DTO 声明的字段直接 400 报错而不是静默丢弃：尽早暴露前后端契约漂移。
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
}

function resolveCorsOrigins(raw: string | undefined): string[] | boolean {
  const origins = (raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (origins.length > 0) return origins
  return process.env.NODE_ENV !== 'production'
}
