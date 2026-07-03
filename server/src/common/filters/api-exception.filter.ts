import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

interface ErrorResponseBody {
  message?: string | string[]
  error?: string
  statusCode?: number
}

interface UnknownErrorLike {
  code?: string
  message?: string
  name?: string
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = getStatus(exception)
    const message = getClientMessage(exception, status)

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(message, exception instanceof Error ? exception.stack : undefined)
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    })
  }
}

function getStatus(exception: unknown) {
  if (exception instanceof HttpException) {
    return exception.getStatus()
  }

  if (isMulterError(exception)) {
    return HttpStatus.BAD_REQUEST
  }

  return HttpStatus.INTERNAL_SERVER_ERROR
}

function getClientMessage(exception: unknown, status: number) {
  if (exception instanceof HttpException) {
    return readHttpExceptionMessage(exception)
  }

  if (isMulterError(exception)) {
    return readMulterMessage(exception)
  }

  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
    return '服务暂时不可用，请稍后再试'
  }

  return readUnknownMessage(exception) || '请求失败，请稍后再试'
}

function readHttpExceptionMessage(exception: HttpException) {
  const payload = exception.getResponse()

  if (typeof payload === 'string') return payload

  const body = payload as ErrorResponseBody
  if (Array.isArray(body.message)) return body.message.join('；')
  return body.message || body.error || exception.message || '请求失败，请稍后再试'
}

function isMulterError(exception: unknown): exception is UnknownErrorLike {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    (exception as UnknownErrorLike).name === 'MulterError'
  )
}

function readMulterMessage(error: UnknownErrorLike) {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return '上传文件不能超过 5MB'
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return '上传字段不正确，请重新选择文件'
  }

  return error.message || '文件上传失败，请重试'
}

function readUnknownMessage(exception: unknown) {
  if (exception instanceof Error) return exception.message
  return ''
}
