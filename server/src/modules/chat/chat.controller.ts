import { Body, Controller, Delete, Get, Param, Patch, Post, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { AiThrottle } from '../../common/guards/ai-throttle.decorator'
import { runSseStream } from '../../common/utils/sse.util'
import type { AuthUserResponse } from '../auth/auth.types'
import { CurrentUser } from '../auth/current-user.decorator'
import { ChatService } from './chat.service'
import { CreateChatSessionDto } from './dto/create-chat-session.dto'
import { SendChatMessageDto } from './dto/send-chat-message.dto'
import { UpdateChatSessionDto } from './dto/update-chat-session.dto'

@ApiTags('职业顾问')
@ApiBearerAuth()
@Controller('chat/sessions')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  createSession(@Body() dto: CreateChatSessionDto, @CurrentUser() user: AuthUserResponse) {
    return this.chatService.createSession(dto, user.id)
  }

  @Get()
  listSessions(@CurrentUser() user: AuthUserResponse) {
    return this.chatService.listSessions(user.id)
  }

  @Get(':sessionId')
  getSession(@Param('sessionId') sessionId: string, @CurrentUser() user: AuthUserResponse) {
    return this.chatService.getSession(sessionId, user.id)
  }

  @Patch(':sessionId')
  updateSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateChatSessionDto,
    @CurrentUser() user: AuthUserResponse,
  ) {
    return this.chatService.updateSession(sessionId, dto, user.id)
  }

  @Delete(':sessionId')
  deleteSession(@Param('sessionId') sessionId: string, @CurrentUser() user: AuthUserResponse) {
    return this.chatService.deleteSession(sessionId, user.id)
  }

  // 仅 AI 生成端点做 AI 级限流；会话 CRUD 走全局限流即可。
  @AiThrottle()
  @Post(':sessionId/messages')
  sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendChatMessageDto,
    @CurrentUser() user: AuthUserResponse,
  ) {
    return this.chatService.sendMessage(sessionId, dto, user.id)
  }

  @AiThrottle()
  @Post(':sessionId/messages/stream')
  sendMessageStream(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendChatMessageDto,
    @CurrentUser() user: AuthUserResponse,
    @Res() res: Response,
  ) {
    return runSseStream(res, 'Chat reply generation started', (callbacks) =>
      this.chatService.sendMessageStream(sessionId, dto, user.id, callbacks),
    )
  }
}
