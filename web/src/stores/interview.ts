import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessage } from '../types/interview'

export const useInterviewStore = defineStore('interview', () => {
  const sessionId = ref('')
  const messages = ref<ChatMessage[]>([])
  const finished = ref(false)

  function startSession(id: string, firstQuestion: string) {
    sessionId.value = id
    finished.value = false
    messages.value = [{ id: crypto.randomUUID(), role: 'ai', content: firstQuestion }]
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

  return {
    sessionId,
    messages,
    finished,
    startSession,
    appendMessage,
    removeMessage,
    finishSession,
  }
})
