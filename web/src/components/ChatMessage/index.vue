<script setup lang="ts">
import FeedbackCard from '../FeedbackCard/index.vue'

defineProps<{
  role: 'ai' | 'user' | 'system'
  content: string
  feedback?: {
    score: number
    comment: string
    problems?: string[]
    betterAnswer?: string
  }
}>()
</script>

<template>
  <div class="chat-message" :class="role">
    <div class="avatar">{{ role === 'user' ? '你' : 'AI' }}</div>
    <div class="message-body">
      <p>{{ content }}</p>
      <FeedbackCard
        v-if="feedback"
        :score="feedback.score"
        :comment="feedback.comment"
        :problems="feedback.problems"
        :better-answer="feedback.betterAnswer"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.chat-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;

  &.user {
    flex-direction: row-reverse;
  }

  &.system {
    justify-content: center;

    .avatar {
      display: none;
    }

    .message-body {
      max-width: 72%;
      background: rgba(15, 23, 42, 0.05);
      color: #334155;
      text-align: center;
    }
  }
}

.avatar {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

.message-body {
  max-width: min(680px, 78%);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.76);
  padding: 14px 16px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);

  p {
    margin: 0;
    color: #243044;
    line-height: 1.75;
  }
}

.chat-message.user {
  .avatar {
    background: var(--gradient-primary);
    color: #ffffff;
  }

  .message-body {
    border-color: transparent;
    background: var(--gradient-primary);

    p {
      color: #ffffff;
    }
  }
}
</style>
