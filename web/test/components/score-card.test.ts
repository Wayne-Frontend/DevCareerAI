import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreCard from '@/components/ScoreCard/index.vue'

describe('ScoreCard', () => {
  it('分数原样显示在 0-100 区间内', () => {
    const wrapper = mount(ScoreCard, { props: { score: 86 } })

    expect(wrapper.get('strong').text()).toBe('86')
  })

  it('越界与非法分数被 clamp：120→100、-5→0、NaN→0', () => {
    expect(
      mount(ScoreCard, { props: { score: 120 } })
        .get('strong')
        .text(),
    ).toBe('100')
    expect(
      mount(ScoreCard, { props: { score: -5 } })
        .get('strong')
        .text(),
    ).toBe('0')
    expect(
      mount(ScoreCard, { props: { score: Number.NaN } })
        .get('strong')
        .text(),
    ).toBe('0')
  })

  it('标题与说明可覆盖', () => {
    const wrapper = mount(ScoreCard, {
      props: { score: 60, title: '匹配度', summary: '自定义说明' },
    })

    expect(wrapper.get('h3').text()).toBe('匹配度')
    expect(wrapper.text()).toContain('自定义说明')
  })
})
