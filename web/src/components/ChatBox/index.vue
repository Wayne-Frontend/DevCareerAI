<script setup lang="ts">
import { ref } from 'vue'
import { Send } from 'lucide-vue-next'
import type { ChatMessage } from '../../types/interview'
import EmptyState from '../EmptyState/index.vue'
import ChatMessageItem from '../ChatMessage/index.vue'

defineProps<{
  messages: ChatMessage[]
  loading?: boolean
}>()

const emit = defineEmits<{
  sendAnswer: [answer: string]
}>()

const answer = ref('')

function send() {
  const value = answer.value.trim()
  if (!value) return

  emit('sendAnswer', value)
  answer.value = ''
}
</script>

<template>
  <div class="grid min-h-[620px] grid-rows-[minmax(420px,1fr)_auto] gap-4">
    <div class="grid min-h-0 content-start gap-4 overflow-auto px-1 pb-2">
      <EmptyState
        v-if="messages.length === 0"
        title="准备开始"
        description="左侧配置完成后，AI 面试官会在这里生成第一道问题。"
      />
      <ChatMessageItem
        v-for="message in messages"
        v-else
        :key="message.id"
        :role="message.role"
        :content="message.content"
        :feedback="message.feedback"
      />
    </div>

    <div class="grid gap-3 bg-transparent">
      <div class="grid grid-cols-[1fr_58px] items-center gap-4">
        <div class="flex min-h-[64px] items-center rounded-full border border-indigo-300/80 bg-white/80 px-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
          <textarea
            v-model="answer"
            class="h-8 flex-1 resize-none border-0 bg-transparent py-1 text-sm font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
            maxlength="1500"
            placeholder="请输入你的回答..."
            @keydown.ctrl.enter.prevent="send"
          />
          <span class="text-xs font-bold text-[#64748b]">{{ answer.length }}/1500</span>
        </div>
        <button class="grid h-[58px] w-[58px] place-items-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-[0_18px_36px_rgba(99,102,241,0.35)] transition hover:-translate-y-0.5" :disabled="loading" @click="send">
          <Send :size="18" />
        </button>
      </div>
      <span class="ml-1 text-xs text-[#94a3b8]">按 Ctrl + Enter 发送</span>
    </div>
  </div>
</template>
