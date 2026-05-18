import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { AI_TEXT_LIMITS } from '../../../common/utils/text-limit.util'

export class OptimizeProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(AI_TEXT_LIMITS.project)
  rawContent: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  targetRole?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  techStack?: string[]

  @IsOptional()
  @IsString()
  @IsIn(['', '简洁专业', '技术细节', '社招强化', '应届友好'])
  style?: string
}
