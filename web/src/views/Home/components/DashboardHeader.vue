<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'

defineProps<{ loading: boolean }>()

const emit = defineEmits<{ refresh: [] }>()
</script>

<template>
  <header class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1>求职作战台</h1>
      <p>AI 驱动的职业竞争力提升，让每一次投递更有把握。</p>
    </div>

    <button class="status-pill" type="button" :disabled="loading" @click="emit('refresh')">
      <RefreshCw :size="15" />
      {{ loading ? '刷新中…' : '刷新数据' }}
    </button>
  </header>
</template>

<style scoped lang="scss">
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.46);
  padding: 0 16px;
  color: #38517d;
  font-size: 14px;
  font-weight: 750;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 12px 28px rgba(31, 73, 125, 0.08);
  backdrop-filter: blur(22px);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    color: #2563eb;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.94),
      0 18px 38px rgba(31, 73, 125, 0.12);
  }
}

@media (max-width: 760px) {
  .status-pill {
    width: 100%;
  }
}
</style>
