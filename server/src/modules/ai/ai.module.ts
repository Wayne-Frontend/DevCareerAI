import { Module } from '@nestjs/common'
import { AiCacheService } from './ai-cache.service'
import { AiService } from './ai.service'

@Module({
  providers: [AiService, AiCacheService],
  exports: [AiService, AiCacheService],
})
export class AiModule {}
