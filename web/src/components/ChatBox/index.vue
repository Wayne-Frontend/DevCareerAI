<script setup lang="ts">
import { ref } from 'vue'
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
  <div class="chat-box">
    <div class="messages">
      <EmptyState
        v-if="messages.length === 0"
        title="准备好开始了吗"
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

    <div class="composer">
      <el-input v-model="answer" type="textarea" :rows="4" placeholder="输入你的回答" />
      <el-button type="primary" :loading="loading" @click="send">发送回答</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chat-box {
  display: grid;
  grid-template-rows: minmax(380px, 1fr) auto;
  gap: 16px;
  min-height: 650px;
}

.messages {
  display: grid;
  min-height: 0;
  max-height: 590px;
  align-content: start;
  gap: 16px;
  overflow: auto;
  padding: 4px 4px 10px;
}

.composer {
  display: grid;
  gap: 10px;
  position: sticky;
  bottom: 0;
  border: 1px solid var(--color-border);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
  padding: 14px;
  backdrop-filter: blur(16px);
}
</style>
