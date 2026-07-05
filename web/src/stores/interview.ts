import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessage, InterviewSessionDetail } from '@/types/interview'

export const useInterviewStore = defineStore('interview', () => {
  const sessionId = ref('')
  const messages = ref<ChatMessage[]>([])
  const finished = ref(false)

  function startSession(id: string, firstQuestion: string) {
    sessionId.value = id
    finished.value = false
    messages.value = [{ id: crypto.randomUUID(), role: 'ai', content: firstQuestion }]
  }

  // 从服务端会话详情恢复对话（刷新/切换设备后继续未完成的面试，或回看已结束会话）。
  function restoreSession(detail: InterviewSessionDetail) {
    sessionId.value = detail.id
    finished.value = detail.status === 'finished'
    messages.value = detail.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      feedback: message.feedback,
    }))
    if (detail.summary) {
      messages.value.push({
        id: crypto.randomUUID(),
        role: 'system',
        content: `${detail.summary.summary}\n\n优势：${detail.summary.strengths.join('；')}\n待提升：${detail.summary.weaknesses.join('；')}\n学习计划：${detail.summary.studyPlan.join('；')}`,
      })
    }
  }

  function appendMessage(message: ChatMessage) {
    messages.value.push(message)
  }

  function removeMessage(id: string) {
    messages.value = messages.value.filter((message) => message.id !== id)
  }

  function finishSession() {
    finished.value = true
  }

  // 登出/会话失效时清空，避免换账号后残留上一账号的面试问答。
  function reset() {
    sessionId.value = ''
    messages.value = []
    finished.value = false
  }

  return {
    sessionId,
    messages,
    finished,
    startSession,
    restoreSession,
    appendMessage,
    removeMessage,
    finishSession,
    reset,
  }
})
