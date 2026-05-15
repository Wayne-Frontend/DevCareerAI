<script setup lang="ts">
defineProps<{
  list: Array<{
    before: string
    after: string
    reason?: string
  }>
}>()
</script>

<template>
  <div class="compare-list">
    <el-empty v-if="list.length === 0" description="暂无优化示例" :image-size="90" />
    <div v-for="item in list" v-else :key="item.before + item.after" class="compare-item">
      <div>
        <span>优化前</span>
        <p>{{ item.before }}</p>
      </div>
      <div>
        <span>优化后</span>
        <p>{{ item.after }}</p>
      </div>
      <small v-if="item.reason">{{ item.reason }}</small>
    </div>
  </div>
</template>

<style scoped lang="scss">
.compare-list {
  display: grid;
  gap: 12px;
}

.compare-item {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.58);
  padding: 14px;

  span {
    color: var(--color-muted);
    font-size: 12px;
  }

  p {
    margin: 6px 0 0;
    line-height: 1.7;
  }

  small {
    grid-column: 1 / -1;
    border-radius: 14px;
    background: rgba(99, 102, 241, 0.08);
    color: #4f46e5;
    padding: 10px 12px;
  }
}
</style>
