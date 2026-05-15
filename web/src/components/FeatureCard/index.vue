<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description: string
}>()
</script>

<template>
  <article class="feature-card glass-card">
    <div class="feature-icon">
      <el-icon><component :is="icon" /></el-icon>
    </div>
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <slot />
  </article>
</template>

<style scoped lang="scss">
.feature-card {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  padding: 22px;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 26px 60px rgba(15, 23, 42, 0.1);
  }

  h2 {
    margin: 18px 0 10px;
    color: var(--color-text);
    font-size: 19px;
    letter-spacing: 0;
  }

  p {
    flex: 1;
    margin: 0 0 18px;
    color: var(--color-muted);
    line-height: 1.75;
  }
}

.feature-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 16px;
  background: var(--gradient-soft);
  color: var(--color-primary);
  font-size: 22px;
}
</style>
