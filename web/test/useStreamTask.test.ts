import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notifyStreamResult, useStreamTask } from '../src/composables/useStreamTask'

const notifyMock = vi.hoisted(() => vi.fn())

vi.mock('../src/utils/notify', () => ({
  notify: notifyMock,
}))

beforeEach(() => {
  notifyMock.mockClear()
})

describe('useStreamTask', () => {
  it('成功路径：run 返回 true，结束后状态复位', async () => {
    const task = useStreamTask()
    let seenSignal: AbortSignal | null = null

    const succeeded = await task.run({
      initialStatus: '连接中',
      abortText: '已取消',
      failText: '失败了',
      runner: async (signal) => {
        seenSignal = signal
        expect(task.loading.value).toBe(true)
        expect(task.streamStatus.value).toBe('连接中')
      },
    })

    expect(succeeded).toBe(true)
    expect(seenSignal).toBeInstanceOf(AbortSignal)
    expect(task.loading.value).toBe(false)
    expect(task.streamStatus.value).toBe('')
    expect(task.errorMessage.value).toBe('')
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('AbortError：notify 取消文案，errorMessage 保持空，返回 false', async () => {
    const task = useStreamTask()

    const succeeded = await task.run({
      abortText: '已取消本次分析',
      failText: '失败了',
      runner: async () => {
        throw new DOMException('canceled', 'AbortError')
      },
    })

    expect(succeeded).toBe(false)
    expect(task.errorMessage.value).toBe('')
    expect(task.loading.value).toBe(false)
    expect(notifyMock).toHaveBeenCalledWith('已取消本次分析', 'info')
  })

  it('普通失败：errorMessage 写入失败文案，返回 false', async () => {
    const task = useStreamTask()

    const succeeded = await task.run({
      abortText: '已取消',
      failText: '生成失败，请稍后重试。',
      runner: async () => {
        throw new Error('network down')
      },
    })

    expect(succeeded).toBe(false)
    expect(task.errorMessage.value).toBe('生成失败，请稍后重试。')
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('再次 run 会清空上一轮的预览与错误', async () => {
    const task = useStreamTask()

    await task.run({
      abortText: '已取消',
      failText: '失败了',
      runner: async () => {
        task.appendDelta('旧内容')
        throw new Error('fail')
      },
    })
    expect(task.streamPreview.value).toBe('旧内容')
    expect(task.errorMessage.value).toBe('失败了')

    await task.run({
      abortText: '已取消',
      failText: '失败了',
      runner: async () => {
        expect(task.streamPreview.value).toBe('')
        expect(task.errorMessage.value).toBe('')
      },
    })
  })

  it('cancel 中止 runner 收到的 signal', async () => {
    const task = useStreamTask()

    const succeeded = await task.run({
      abortText: '已取消',
      failText: '失败了',
      runner: async (signal) => {
        task.cancel()
        expect(signal.aborted).toBe(true)
        throw new DOMException('canceled', 'AbortError')
      },
    })

    expect(succeeded).toBe(false)
    expect(notifyMock).toHaveBeenCalledWith('已取消', 'info')
  })

  it('appendDelta 追加内容并更新状态文案', () => {
    const task = useStreamTask()

    task.appendDelta('第一段')
    expect(task.streamPreview.value).toBe('第一段')
    expect(task.streamStatus.value).toBe('AI 正在流式生成')

    task.appendDelta('，第二段', '自定义状态')
    expect(task.streamPreview.value).toBe('第一段，第二段')
    expect(task.streamStatus.value).toBe('自定义状态')
  })
})

describe('notifyStreamResult', () => {
  const texts = { success: '结果已生成', cached: '命中缓存，结果已生成' }

  it('parse_error 固定 warning 文案，且不再弹成功提示', () => {
    notifyStreamResult({ status: 'parse_error' }, true, texts)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock).toHaveBeenCalledWith('AI 结果格式异常，已保留原文整理结果', 'warning')
  })

  it('命中缓存走 cached 文案', () => {
    notifyStreamResult({ status: 'success' }, true, texts)
    expect(notifyMock).toHaveBeenCalledWith('命中缓存，结果已生成', 'success')
  })

  it('正常成功走 success 文案（meta 缺失视为成功）', () => {
    notifyStreamResult(undefined, false, texts)
    expect(notifyMock).toHaveBeenCalledWith('结果已生成', 'success')
  })

  it('不传 texts 时成功静默，只提示 parse_error', () => {
    notifyStreamResult({ status: 'success' }, false)
    expect(notifyMock).not.toHaveBeenCalled()

    notifyStreamResult({ status: 'parse_error' }, false)
    expect(notifyMock).toHaveBeenCalledWith('AI 结果格式异常，已保留原文整理结果', 'warning')
  })
})
