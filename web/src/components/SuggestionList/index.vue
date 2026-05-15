<script setup lang="ts">
defineProps<{
  title: string
  items: string[]
}>()
</script>

<template>
  <section class="suggestion-list">
    <h3>{{ title }}</h3>
    <el-empty v-if="items.length === 0" description="暂无内容" :image-size="70" />
    <ul v-else>
      <li v-for="item in items" :key="item">
        <span />
        {{ item }}
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.suggestion-list {
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.58);
  padding: 16px;

  h3 {
    margin: 0 0 12px;
    font-size: 15px;
  }

  ul {
    display: grid;
    gap: 9px;
    margin: 0;
    padding: 0;
    color: #344054;
    line-height: 1.8;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: 10px 1fr;
    gap: 10px;
    align-items: start;
  }

  li span {
    width: 8px;
    height: 8px;
    margin-top: 10px;
    border-radius: 50%;
    background: var(--gradient-primary);
  }
}
</style>
