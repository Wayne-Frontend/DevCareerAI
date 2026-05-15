<script setup lang="ts">
withDefaults(
  defineProps<{
    tags: string[]
    type?: 'success' | 'warning' | 'danger' | 'info'
  }>(),
  {
    type: 'info',
  },
)
</script>

<template>
  <div class="keyword-tags">
    <span v-for="tag in tags" :key="tag" class="keyword-tag" :class="type">{{ tag }}</span>
    <el-empty v-if="tags.length === 0" description="暂无关键词" :image-size="80" />
  </div>
</template>

<style scoped lang="scss">
.keyword-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  border: 1px solid rgba(99, 102, 241, 0.14);
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 760;

  &.success {
    border-color: rgba(34, 197, 94, 0.16);
    background: rgba(34, 197, 94, 0.1);
    color: #15803d;
  }

  &.warning {
    border-color: rgba(245, 158, 11, 0.18);
    background: rgba(245, 158, 11, 0.11);
    color: #b45309;
  }

  &.danger {
    border-color: rgba(239, 68, 68, 0.16);
    background: rgba(239, 68, 68, 0.09);
    color: #dc2626;
  }
}
</style>
