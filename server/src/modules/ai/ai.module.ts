import { Module } from '@nestjs/common'
import { AiCacheService } from './ai-cache.service'
import { AiUsageController } from './ai-usage.controller'
import { AiUsageService } from './ai-usage.service'
import { AiService } from './ai.service'
import { AI_PROVIDER } from './providers/ai-provider.interface'
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider'

@Module({
  controllers: [AiUsageController],
  providers: [
    AiService,
    AiCacheService,
    AiUsageService,
    { provide: AI_PROVIDER, useClass: OpenAiCompatibleProvider },
  ],
  exports: [AiService, AiCacheService, AiUsageService],
})
export class AiModule {}
