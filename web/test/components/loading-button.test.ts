import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LoadingButton from '@/components/LoadingButton/index.vue'

describe('LoadingButton', () => {
  it('loading 时禁用按钮并显示 spinner', () => {
    const wrapper = mount(LoadingButton, { props: { loading: true } })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.loading-button__spinner').exists()).toBe(true)
  })

  it('默认插槽为空且 loading 时显示 loadingText', () => {
    const wrapper = mount(LoadingButton, {
      props: { loading: true, loadingText: '提交中...' },
    })

    expect(wrapper.text()).toContain('提交中...')
  })

  it('传了插槽时 loading 也优先显示 loadingText（调用方无需手写三元）', () => {
    const wrapper = mount(LoadingButton, {
      props: { loading: true, loadingText: '保存中...' },
      slots: { default: '保存修改' },
    })

    expect(wrapper.text()).toContain('保存中...')
    expect(wrapper.text()).not.toContain('保存修改')
    expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
  })

  it('非 loading 时不禁用、不出现 spinner，渲染插槽内容', () => {
    const wrapper = mount(LoadingButton, { slots: { default: '保存' } })

    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.loading-button__spinner').exists()).toBe(false)
    expect(wrapper.text()).toContain('保存')
  })

  it('variant 切换样式类，disabled 单独生效', () => {
    const wrapper = mount(LoadingButton, { props: { variant: 'danger', disabled: true } })

    expect(wrapper.get('button').classes()).toContain('loading-button--danger')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
