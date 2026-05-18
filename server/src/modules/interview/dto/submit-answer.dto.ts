import { IsString, MaxLength, MinLength } from 'class-validator'
import { AI_TEXT_LIMITS } from '../../../common/utils/text-limit.util'

export class SubmitAnswerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(AI_TEXT_LIMITS.answer)
  answer: string
}
