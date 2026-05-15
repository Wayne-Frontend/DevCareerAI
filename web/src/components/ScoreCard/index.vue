<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    score: number
    title?: string
  }>(),
  {
    title: '综合评分',
  },
)

const safeScore = computed(() => Math.max(0, Math.min(100, props.score)))
</script>

<template>
  <div class="score-card">
    <div class="score-main">
      <strong>{{ safeScore }}</strong>
      <span>/ 100</span>
    </div>
    <div class="score-copy">
      <h3>{{ title }}</h3>
      <p>{{ safeScore >= 70 ? '整体基础不错，适合继续打磨细节和表达证据。' : '可以从结构和岗位关键词开始补强。' }}</p>
      <el-progress :percentage="safeScore" :show-text="false" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.score-card {
  display: grid;
  grid-template-columns: 128px 1fr;
  align-items: center;
  gap: 20px;
  border: 1px solid rgba(99, 102, 241, 0.16);
  border-radius: 24px;
  background:
    radial-gradient(circle at 10% 10%, rgba(99, 102, 241, 0.16), transparent 38%),
    rgba(255, 255, 255, 0.66);
  padding: 18px;

  h3 {
    margin: 0 0 8px;
    font-size: 17px;
  }

  p {
    margin: 0 0 14px;
    color: var(--color-muted);
    line-height: 1.7;
  }
}

.score-main {
  display: grid;
  width: 128px;
  height: 128px;
  place-items: center;
  align-content: center;
  border-radius: 50%;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    var(--gradient-primary) border-box;
  border: 7px solid transparent;
  box-shadow: 0 18px 42px rgba(99, 102, 241, 0.16);

  strong {
    color: var(--color-primary);
    font-size: 38px;
    line-height: 1;
  }

  span {
    color: var(--color-muted);
    font-size: 12px;
    font-weight: 700;
  }
}

.score-copy {
  min-width: 0;
}
</style>
