import { Module } from '@nestjs/common'
import { AiCacheService } from './ai-cache.service'
import { AiService } from './ai.service'
import { AI_PROVIDER } from './providers/ai-provider.interface'
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider'

@Module({
  providers: [
    AiService,
    AiCacheService,
    { provide: AI_PROVIDER, useClass: OpenAiCompatibleProvider },
  ],
  exports: [AiService, AiCacheService],
})
export class AiModule {}
