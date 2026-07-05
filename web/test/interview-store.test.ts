import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useInterviewStore } from '@/stores/interview'
import type { InterviewSessionDetail } from '@/types/interview'

function buildDetail(overrides: Partial<InterviewSessionDetail> = {}): InterviewSessionDetail {
  return {
    id: 'session-1',
    status: 'ongoing',
    messages: [
      { id: 'm1', role: 'ai', content: '第一题', createdAt: '' },
      { id: 'm2', role: 'user', content: '我的回答', createdAt: '' },
    ],
    summary: null,
    ...overrides,
  } as InterviewSessionDetail
}

describe('interview store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('startSession 重置 finished 并写入首题', () => {
    const store = useInterviewStore()
    store.finishSession()

    store.startSession('s1', '请自我介绍')

    expect(store.sessionId).toBe('s1')
    expect(store.finished).toBe(false)
    expect(store.messages.length).toBe(1)
    expect(store.messages[0]).toMatchObject({ role: 'ai', content: '请自我介绍' })
  })

  it('restoreSession 恢复历史消息并映射 finished 状态', () => {
    const store = useInterviewStore()

    store.restoreSession(buildDetail({ status: 'finished' }))

    expect(store.finished).toBe(true)
    expect(store.messages.map((message) => message.content)).toEqual(['第一题', '我的回答'])
  })

  it('restoreSession 有总结时追加一条 system 消息，拼入优势/待提升/学习计划', () => {
    const store = useInterviewStore()

    store.restoreSession(
      buildDetail({
        status: 'finished',
        summary: {
          totalScore: 80,
          summary: '整体表现不错',
          strengths: ['表达清晰', '有项目思维'],
          weaknesses: ['深度不足'],
          studyPlan: ['补底层原理'],
        },
      }),
    )

    const last = store.messages[store.messages.length - 1]
    expect(last.role).toBe('system')
    expect(last.content).toContain('整体表现不错')
    expect(last.content).toContain('优势：表达清晰；有项目思维')
    expect(last.content).toContain('待提升：深度不足')
    expect(last.content).toContain('学习计划：补底层原理')
  })

  it('restoreSession 无总结时不追加 system 消息', () => {
    const store = useInterviewStore()

    store.restoreSession(buildDetail())

    expect(store.messages.some((message) => message.role === 'system')).toBe(false)
  })
})
