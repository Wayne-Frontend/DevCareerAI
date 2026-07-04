import { deepEqual, equal, ok, rejects } from 'node:assert/strict'
import { test } from 'node:test'
import { AiStreamInterruptedError } from '../src/modules/ai/ai-errors'
import { AiService } from '../src/modules/ai/ai.service'
import type { AiUsageService } from '../src/modules/ai/ai-usage.service'
import type { AiProvider } from '../src/modules/ai/providers/ai-provider.interface'

interface RecordedCall {
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
  usageSource?: string
  model: string
  feature?: string
}

function createService(provider: Partial<AiProvider>) {
  const records: RecordedCall[] = []
  const usageService = {
    record: async (input: RecordedCall) => {
      records.push(input)
    },
  } as unknown as AiUsageService
  const service = new AiService(
    { getModel: () => 'test-model', ...provider } as AiProvider,
    usageService,
  )
  return { service, records }
}

test('chatStream 上报了 usage 时按 reported 记录', async () => {
  const usage = { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
  const { service, records } = createService({
    chatStream: async () => ({ text: 'hello', usage, model: 'test-model' }),
  })

  await service.chatStream({ systemPrompt: 's', userPrompt: 'u', feature: 'f', userId: 'u1' })

  equal(records.length, 1)
  equal(records[0].usageSource, 'reported')
  deepEqual(records[0].usage, usage)
})

test('chatStream 缺失 usage 时按文本长度估算并标记 estimated', async () => {
  const { service, records } = createService({
    chatStream: async () => ({ text: 'a'.repeat(400), usage: undefined, model: 'test-model' }),
  })

  await service.chatStream({ systemPrompt: 'sys', userPrompt: 'user', feature: 'f', userId: 'u1' })

  equal(records.length, 1)
  equal(records[0].usageSource, 'estimated')
  equal(records[0].usage?.completion_tokens, 100)
  ok((records[0].usage?.prompt_tokens ?? 0) > 0, 'prompt 侧也应有估算值')
})

test('chatStream 中断时按部分文本落一条估算用量并继续抛错', async () => {
  const { service, records } = createService({
    chatStream: async () => {
      throw new AiStreamInterruptedError('test-model', '中'.repeat(100), undefined, 'cancelled')
    },
  })

  await rejects(
    () => service.chatStream({ systemPrompt: 's', userPrompt: 'u', feature: 'f', userId: 'u1' }),
    AiStreamInterruptedError,
  )

  equal(records.length, 1)
  equal(records[0].usageSource, 'estimated')
  equal(records[0].usage?.completion_tokens, 60)
})

test('chatStream 中断但携带 usage 时优先使用上报值', async () => {
  const usage = { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 }
  const { service, records } = createService({
    chatStream: async () => {
      throw new AiStreamInterruptedError('test-model', 'partial', usage, 'cancelled')
    },
  })

  await rejects(() =>
    service.chatStream({ systemPrompt: 's', userPrompt: 'u', feature: 'f', userId: 'u1' }),
  )

  equal(records[0].usageSource, 'reported')
  deepEqual(records[0].usage, usage)
})

test('chat 非流式调用缺失 usage 时同样估算', async () => {
  const { service, records } = createService({
    chat: async () => ({ text: 'answer', usage: undefined, model: 'test-model' }),
  })

  const text = await service.chat({ systemPrompt: 's', userPrompt: 'u', feature: 'f' })

  equal(text, 'answer')
  equal(records[0].usageSource, 'estimated')
})

test('多轮 messages 场景的 prompt 估算覆盖全部轮次', async () => {
  const { service, records } = createService({
    chatStream: async () => ({ text: '', usage: undefined, model: 'test-model' }),
  })

  await service.chatStream({
    systemPrompt: '',
    messages: [
      { role: 'user', content: 'a'.repeat(400) },
      { role: 'assistant', content: 'b'.repeat(400) },
    ],
    feature: 'f',
  })

  ok((records[0].usage?.prompt_tokens ?? 0) >= 200, '多轮内容应全部计入 prompt 估算')
})
