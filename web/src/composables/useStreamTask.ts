import { getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import type { AiResponseMeta } from '@/types/common'
import { notify } from '@/utils/notify'

interface RunStreamOptions {
  /** run 开始时的 streamStatus 文案 */
  initialStatus?: string
  /** 用户取消（AbortError）时的 notify 文案，如「已取消本次分析」 */
  abortText: string
  /** 失败时写入 errorMessage 的文案，如「简历诊断生成失败，请稍后重试。」 */
  failText: string
  /** 业务逻辑：发起流式请求并处理结果，signal 用于取消 */
  runner: (signal: AbortSignal) => Promise<void>
}

/**
 * AI 流式提交的统一生命周期封装：loading / 流式预览 / 状态文案 / 错误文案 /
 * AbortController 的创建、取消与组件卸载清理。
 *
 * 返回的 ref 名称与各页面原有变量一致（loading/streamPreview/streamStatus/errorMessage），
 * 模板无需改动。成功提示（parse_error/cached/正常三分支）文案因页而异，
 * 由调用方在 runner 内用 notifyStreamResult 处理，不进 run 的生命周期。
 */
export function useStreamTask() {
  const loading = ref(false)
  const streamPreview = ref('')
  const streamStatus = ref('')
  const errorMessage = ref('')
  const controller = ref<AbortController | null>(null)

  /**
   * 执行一次流式任务。返回是否成功（取消/失败均为 false），
   * 调用方可据此做失败回滚（如移除乐观追加的消息、回填输入框）。
   */
  async function run(options: RunStreamOptions): Promise<boolean> {
    controller.value = new AbortController()
    loading.value = true
    streamPreview.value = ''
    streamStatus.value = options.initialStatus ?? 'AI 正在建立连接'
    errorMessage.value = ''

    try {
      await options.runner(controller.value.signal)
      return true
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        notify(options.abortText, 'info')
      } else {
        errorMessage.value = options.failText
      }
      return false
    } finally {
      loading.value = false
      controller.value = null
      streamStatus.value = ''
    }
  }

  /** onDelta 处理：追加流式预览内容并更新状态文案 */
  function appendDelta(delta: string, statusText = 'AI 正在流式生成') {
    streamStatus.value = statusText
    streamPreview.value += delta
  }

  function cancel() {
    controller.value?.abort()
  }

  // 组件卸载时中止在途请求；getCurrentInstance 守卫让单测可以脱离组件直接调用。
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      controller.value?.abort()
    })
  }

  return { loading, streamPreview, streamStatus, errorMessage, run, cancel, appendDelta }
}

/**
 * 流式任务成功后的统一提示三分支：parse_error（warning，全站统一文案）→ 命中缓存 → 正常。
 * 不传 texts 时只提示 parse_error（如面试追问场景，持续对话不需要每次弹成功）。
 */
export function notifyStreamResult(
  meta: AiResponseMeta | undefined,
  cached: boolean | undefined,
  texts?: { success: string; cached: string },
) {
  if (meta?.status === 'parse_error') {
    notify('AI 结果格式异常，已保留原文整理结果', 'warning')
    return
  }
  if (!texts) return
  notify(cached ? texts.cached : texts.success, 'success')
}
