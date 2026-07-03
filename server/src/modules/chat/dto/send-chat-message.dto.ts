import { IsString, MaxLength, MinLength } from 'class-validator'
import type { SendChatMessagePayload } from '@devcareer/shared'
import { AI_TEXT_LIMITS } from '../../../common/utils/text-limit.util'

export class SendChatMessageDto implements SendChatMessagePayload {
  @IsString()
  @MinLength(1)
  @MaxLength(AI_TEXT_LIMITS.answer)
  content: string
}
