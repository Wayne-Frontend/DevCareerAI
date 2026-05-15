<script setup lang="ts">
defineProps<{
  score: number
  comment: string
  problems?: string[]
  betterAnswer?: string
}>()
</script>

<template>
  <div class="feedback-card">
    <div class="feedback-score">
      <strong>{{ score }}</strong>
      <span>点评分</span>
    </div>
    <div class="feedback-body">
      <p>{{ comment }}</p>
      <ul v-if="problems?.length">
        <li v-for="problem in problems" :key="problem">{{ problem }}</li>
      </ul>
      <div v-if="betterAnswer" class="better-answer">
        <span>参考回答</span>
        <p>{{ betterAnswer }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.feedback-card {
  display: grid;
  grid-template-columns: 86px 1fr;
  gap: 14px;
  border: 1px solid rgba(99, 102, 241, 0.16);
  border-radius: 18px;
  background: rgba(99, 102, 241, 0.07);
  padding: 14px;
}

.feedback-score {
  display: grid;
  min-height: 74px;
  place-items: center;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.74);

  strong {
    color: var(--color-primary);
    font-size: 28px;
    line-height: 1;
  }

  span {
    color: var(--color-muted);
    font-size: 12px;
  }
}

.feedback-body {
  p {
    margin: 0;
    color: #334155;
    line-height: 1.7;
  }

  ul {
    margin: 8px 0 0;
    padding-left: 18px;
    color: #475569;
    line-height: 1.7;
  }
}

.better-answer {
  margin-top: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.66);
  padding: 12px;

  span {
    display: block;
    margin-bottom: 6px;
    color: var(--color-primary);
    font-size: 12px;
    font-weight: 800;
  }
}
</style>
