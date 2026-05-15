<script setup lang="ts">
import { MagicStick } from '@element-plus/icons-vue'

withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: '等待开始',
    description: '填写左侧信息后，这里会展示 AI 生成的结构化结果。',
  },
)
</script>

<template>
  <div class="empty-state">
    <div class="empty-orb">
      <el-icon><MagicStick /></el-icon>
    </div>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<style scoped lang="scss">
.empty-state {
  display: grid;
  min-height: 280px;
  place-items: center;
  align-content: center;
  gap: 12px;
  border: 1px dashed rgba(99, 102, 241, 0.24);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.42);
  padding: 34px;
  text-align: center;

  h3 {
    margin: 0;
    color: var(--color-text);
    font-size: 18px;
  }

  p {
    max-width: 360px;
    margin: 0;
    color: var(--color-muted);
    line-height: 1.7;
  }
}

.empty-orb {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border-radius: 22px;
  background: var(--gradient-soft);
  color: var(--color-primary);
  font-size: 30px;
}
</style>
