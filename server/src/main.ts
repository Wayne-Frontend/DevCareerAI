import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
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
  app.useGlobalFilters(new ApiExceptionFilter())
  app.enableCors({
    origin: true,
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  await app.listen(port)
}

void bootstrap()

