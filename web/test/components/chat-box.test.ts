import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatBox from '@/components/ChatBox/index.vue'

const sendButton = 'button[aria-label="发送回答"]'

describe('ChatBox', () => {
  it('输入有效内容后发送：emit trim 后的文本并清空输入框', async () => {
    const wrapper = mount(ChatBox, { props: { messages: [] } })

    await wrapper.get('textarea').setValue('  我的回答  ')
    await wrapper.get(sendButton).trigger('click')

    expect(wrapper.emitted('sendAnswer')).toEqual([['我的回答']])
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('纯空白内容不可发送', async () => {
    const wrapper = mount(ChatBox, { props: { messages: [] } })

    await wrapper.get('textarea').setValue('   ')
    expect(wrapper.get(sendButton).attributes('disabled')).toBeDefined()

    await wrapper.get(sendButton).trigger('click')
    expect(wrapper.emitted('sendAnswer')).toBeUndefined()
  })

  it('loading 时禁用输入与发送', async () => {
    const wrapper = mount(ChatBox, { props: { messages: [], loading: true } })

    await wrapper.get('textarea').setValue('回答')
    expect(wrapper.get(sendButton).attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('AI 思考中')
  })

  it('disabled 时显示结束提示文案（可覆盖）', () => {
    const wrapper = mount(ChatBox, {
      props: { messages: [], disabled: true, disabledHint: '会话已归档' },
    })

    expect(wrapper.text()).toContain('会话已归档')
  })

  it('无消息时显示空状态标题', () => {
    const wrapper = mount(ChatBox, {
      props: { messages: [], emptyTitle: '准备开始' },
    })

    expect(wrapper.text()).toContain('准备开始')
  })

  it('Ctrl+Enter 触发发送', async () => {
    const wrapper = mount(ChatBox, { props: { messages: [] } })

    await wrapper.get('textarea').setValue('快捷键发送')
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter', ctrlKey: true })

    expect(wrapper.emitted('sendAnswer')).toEqual([['快捷键发送']])
  })
})
