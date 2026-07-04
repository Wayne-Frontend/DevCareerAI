import { INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { join } from 'path'
import { static as serveStatic } from 'express'
import { AppModule } from './app.module'
import { ApiExceptionFilter } from './common/filters/api-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT') || 3000

  app.use('/uploads', serveStatic(join(process.cwd(), 'uploads')))
  app.setGlobalPrefix('api')

  // 接口文档只在非生产环境开放，避免向公网暴露完整 API 结构。
  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app)
  }
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

  await app.listen(port)
}

function resolveCorsOrigins(raw: string | undefined): string[] | boolean {
  const origins = (raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (origins.length > 0) return origins
  return process.env.NODE_ENV !== 'production'
}

function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('DevCareer AI API')
    .setDescription('DevCareer AI 服务端接口文档。除登录/注册外均需 Bearer Token。')
    .setVersion('0.1.0')
    // 全局前缀 /api 不会写进文档路径，这里补一个 server 让「Try it out」命中真实地址。
    .addServer('/api')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  // UI 挂在 /api/docs（setGlobalPrefix 不影响此处显式路径）。
  SwaggerModule.setup('api/docs', app, document)
}

void bootstrap()
