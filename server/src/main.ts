import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { join } from 'path'
import { static as serveStatic } from 'express'
import { AppModule } from './app.module'
import { setupApp } from './app.setup'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT') || 3000

  app.use('/uploads', serveStatic(join(process.cwd(), 'uploads')))

  setupApp(app)
  // 接口文档只在非生产环境开放，避免向公网暴露完整 API 结构。
  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app)
  }

  await app.listen(port)
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
