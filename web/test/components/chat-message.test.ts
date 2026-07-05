import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatMessage from '@/components/ChatMessage/index.vue'

describe('ChatMessage', () => {
  it('XSS 回归：markdown 模式下原始 HTML 被转义，不产生可执行节点', () => {
    const wrapper = mount(ChatMessage, {
      props: {
        role: 'ai',
        markdown: true,
        content: '试试注入 <script>alert(1)</script> 和 <img src=x onerror=alert(2)>',
      },
    })

    const html = wrapper.get('.markdown-body').element.innerHTML
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('仅 ai 角色且 markdown 开启时才走 Markdown 渲染，用户消息保持纯文本', () => {
    const ai = mount(ChatMessage, {
      props: { role: 'ai', markdown: true, content: '**加粗**' },
    })
    expect(ai.find('.markdown-body strong').exists()).toBe(true)

    const user = mount(ChatMessage, {
      props: { role: 'user', markdown: true, content: '**加粗**' },
    })
    expect(user.find('.markdown-body').exists()).toBe(false)
    expect(user.get('p').text()).toBe('**加粗**')
  })

  it('AI 内容为空时显示打字动画（等待流式首包）', () => {
    const wrapper = mount(ChatMessage, { props: { role: 'ai', content: '' } })

    expect(wrapper.find('.typing-dots').exists()).toBe(true)
  })

  it('带 feedback 时渲染点评卡片', () => {
    const wrapper = mount(ChatMessage, {
      props: {
        role: 'user',
        content: '我的回答',
        feedback: { score: 80, comment: '思路清晰' },
      },
    })

    expect(wrapper.text()).toContain('思路清晰')
  })
})
