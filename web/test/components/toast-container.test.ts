import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ToastContainer from '@/components/ToastContainer/index.vue'
import { notify } from '@/utils/notify'

// 组件通过 Teleport 渲染到 body，断言统一走 document 查询
function visibleToasts() {
  return document.body.querySelectorAll('.toast-card')
}

describe('ToastContainer + notify', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.useFakeTimers()
    wrapper = mount(ToastContainer, { attachTo: document.body })
  })

  afterEach(() => {
    wrapper.unmount()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('notify 派发 app-notify 事件后展示对应类型的 toast', async () => {
    notify('保存成功', 'success')
    await nextTick()

    const cards = visibleToasts()
    expect(cards.length).toBe(1)
    expect(cards[0].className).toContain('toast-card--success')
    expect(cards[0].textContent).toContain('保存成功')
  })

  it('同屏最多保留 4 条，超出时挤掉最早的', async () => {
    for (let index = 1; index <= 5; index += 1) {
      notify(`消息 ${index}`)
    }
    await nextTick()

    const cards = visibleToasts()
    expect(cards.length).toBe(4)
    expect(document.body.textContent).not.toContain('消息 1')
    expect(document.body.textContent).toContain('消息 5')
  })

  it('普通 toast 4200ms 后自动消失，error 保留到 5600ms', async () => {
    notify('普通提示', 'info')
    notify('出错了', 'error')
    await nextTick()
    expect(visibleToasts().length).toBe(2)

    vi.advanceTimersByTime(4300)
    await nextTick()
    expect(document.body.textContent).not.toContain('普通提示')
    expect(document.body.textContent).toContain('出错了')

    vi.advanceTimersByTime(1400)
    await nextTick()
    expect(visibleToasts().length).toBe(0)
  })

  it('点击关闭按钮立即移除', async () => {
    notify('手动关闭我')
    await nextTick()

    document.body.querySelector<HTMLButtonElement>('.toast-card__close')?.click()
    await nextTick()

    expect(visibleToasts().length).toBe(0)
  })

  it('缺少 message 的事件被忽略', async () => {
    window.dispatchEvent(new CustomEvent('app-notify', { detail: {} }))
    await nextTick()

    expect(visibleToasts().length).toBe(0)
  })
})
