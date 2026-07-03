import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkflowStore } from '../src/stores/workflow'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useWorkflowStore', () => {
  it('setInterviewContext 过滤空白与非字符串字段', () => {
    const store = useWorkflowStore()
    store.setInterviewContext({
      targetRole: '前端',
      resumeContent: '   ',
      jobDescription: 'JD 内容',
    })
    expect(store.interviewContext).toEqual({ targetRole: '前端', jobDescription: 'JD 内容' })
  })

  it('全为空时置为 null', () => {
    const store = useWorkflowStore()
    store.setInterviewContext({ targetRole: '  ', resumeContent: '' })
    expect(store.interviewContext).toBeNull()
  })

  it('consumeInterviewContext 读取后清空（一次性）', () => {
    const store = useWorkflowStore()
    store.setInterviewContext({ targetRole: '后端' })
    expect(store.consumeInterviewContext()).toEqual({ targetRole: '后端' })
    expect(store.interviewContext).toBeNull()
    expect(store.consumeInterviewContext()).toBeNull()
  })
})
