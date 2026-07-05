import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '@/stores/chat'
import type { ChatMessageRecord, ChatSessionSummary } from '@/types/chat'

function buildSession(id: string, title = `会话 ${id}`): ChatSessionSummary {
  return {
    id,
    title,
    resumeId: null,
    jobDescriptionId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    resume: null,
    jobDescription: null,
  } as ChatSessionSummary
}

describe('chat store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('openSession 把服务端记录映射为 ChatBox 消息形状', () => {
    const store = useChatStore()
    const records = [
      { id: 'm1', role: 'user', content: '你好', createdAt: '' },
      { id: 'm2', role: 'ai', content: '你好，我是顾问', createdAt: '' },
    ] as ChatMessageRecord[]

    store.openSession('s1', records)

    expect(store.activeSessionId).toBe('s1')
    expect(store.messages).toEqual([
      { id: 'm1', role: 'user', content: '你好' },
      { id: 'm2', role: 'ai', content: '你好，我是顾问' },
    ])
  })

  it('appendToMessage 按 id 追加流式增量，找不到时静默忽略', () => {
    const store = useChatStore()
    store.appendMessage({ id: 'ai-1', role: 'ai', content: '' })

    store.appendToMessage('ai-1', '第一段')
    store.appendToMessage('ai-1', '，第二段')
    store.appendToMessage('missing', '不应生效')

    expect(store.messages[0].content).toBe('第一段，第二段')
    expect(store.messages.length).toBe(1)
  })

  it('upsertSession 新会话置顶，已有会话更新后去重置顶', () => {
    const store = useChatStore()
    store.setSessions([buildSession('a'), buildSession('b')])

    store.upsertSession(buildSession('b', '更新后的标题'))

    expect(store.sessions.map((session) => session.id)).toEqual(['b', 'a'])
    expect(store.sessions[0].title).toBe('更新后的标题')
  })

  it('removeSession 删除当前激活会话时回落到草稿态', () => {
    const store = useChatStore()
    store.setSessions([buildSession('a'), buildSession('b')])
    store.openSession('a', [])
    store.appendMessage({ id: 'm1', role: 'user', content: 'hi' })

    store.removeSession('a')

    expect(store.sessions.map((session) => session.id)).toEqual(['b'])
    expect(store.activeSessionId).toBe('')
    expect(store.messages).toEqual([])
  })

  it('removeSession 删除非激活会话不影响当前对话', () => {
    const store = useChatStore()
    store.setSessions([buildSession('a'), buildSession('b')])
    store.openSession('a', [])

    store.removeSession('b')

    expect(store.activeSessionId).toBe('a')
  })
})
