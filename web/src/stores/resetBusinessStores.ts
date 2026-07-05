import { useChatStore } from '@/stores/chat'
import { useInterviewStore } from '@/stores/interview'
import { useResumeStore } from '@/stores/resume'
import { useWorkflowStore } from '@/stores/workflow'

/**
 * 清空全部业务 store。登出或会话失效（401 跳登录）时调用，
 * 防止 SPA 不刷新的情况下换账号登录后，残留上一账号的简历、面试问答、
 * 顾问对话等敏感内容（auth store 由 clearSession 单独处理）。
 */
export function resetBusinessStores() {
  useChatStore().reset()
  useInterviewStore().reset()
  useResumeStore().reset()
  useWorkflowStore().reset()
}
