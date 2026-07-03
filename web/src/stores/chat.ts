import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessage } from '@/types/interview'
import type { ChatMessageRecord, ChatSessionSummary } from '@/types/chat'

/**
 * 职业顾问（通用聊天）状态。与面试 store 类似，但额外维护会话列表，
 * 支持在页面内新建 / 切换 / 删除会话；消息复用 ChatBox 的 ChatMessage 形状。
 */
export const useChatStore = defineStore('chat', () => {
  const sessions = ref<ChatSessionSummary[]>([])
  const activeSessionId = ref('')
  const messages = ref<ChatMessage[]>([])

  function setSessions(list: ChatSessionSummary[]) {
    sessions.value = list
  }

  function openSession(sessionId: string, records: ChatMessageRecord[]) {
    activeSessionId.value = sessionId
    messages.value = records.map((record) => ({
      id: record.id,
      role: record.role,
      content: record.content,
    }))
  }

  // 草稿态：尚未创建后端会话，首条消息发送时才落库。
  function startDraft() {
    activeSessionId.value = ''
    messages.value = []
  }

  function appendMessage(message: ChatMessage) {
    messages.value.push(message)
  }

  function appendToMessage(id: string, delta: string) {
    const message = messages.value.find((item) => item.id === id)
    if (message) {
      message.content += delta
    }
  }

  function updateMessage(id: string, patch: Partial<ChatMessage>) {
    const index = messages.value.findIndex((item) => item.id === id)
    if (index >= 0) {
      messages.value[index] = { ...messages.value[index], ...patch }
    }
  }

  function removeMessage(id: string) {
    messages.value = messages.value.filter((message) => message.id !== id)
  }

  // 新建或更新后置顶（列表按最近活跃排序）。
  function upsertSession(session: ChatSessionSummary) {
    sessions.value = [session, ...sessions.value.filter((item) => item.id !== session.id)]
  }

  function patchSession(sessionId: string, patch: Partial<ChatSessionSummary>) {
    const index = sessions.value.findIndex((item) => item.id === sessionId)
    if (index >= 0) {
      sessions.value[index] = { ...sessions.value[index], ...patch }
    }
  }

  function removeSession(sessionId: string) {
    sessions.value = sessions.value.filter((item) => item.id !== sessionId)
    if (activeSessionId.value === sessionId) {
      startDraft()
    }
  }

  return {
    sessions,
    activeSessionId,
    messages,
    setSessions,
    openSession,
    startDraft,
    appendMessage,
    appendToMessage,
    updateMessage,
    removeMessage,
    upsertSession,
    patchSession,
    removeSession,
  }
})
