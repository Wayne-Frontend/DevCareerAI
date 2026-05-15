import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessage } from '../types/interview'

export const useInterviewStore = defineStore('interview', () => {
  const sessionId = ref('')
  const messages = ref<ChatMessage[]>([])

  function startSession(id: string, firstQuestion: string) {
    sessionId.value = id
    messages.value = [{ id: crypto.randomUUID(), role: 'ai', content: firstQuestion }]
  }

  function appendMessage(message: ChatMessage) {
    messages.value.push(message)
  }

  return {
    sessionId,
    messages,
    startSession,
    appendMessage,
  }
})
