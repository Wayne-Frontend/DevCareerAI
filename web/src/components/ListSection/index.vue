<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    title: string
    icon: Component
    items: string[]
    ordered?: boolean
  }>(),
  { ordered: false },
)
</script>

<template>
  <section class="section-card">
    <h3 class="mb-3 mt-0 flex items-center gap-2 text-lg font-black text-[#0f172a]">
      <component :is="icon" :size="20" class="text-indigo-500" />
      {{ title }}
    </h3>
    <p v-if="items.length === 0" class="m-0 text-sm text-[#94a3b8]">暂无内容</p>
    <ol v-else-if="ordered" class="m-0 grid gap-2 pl-5 text-sm font-semibold leading-7 text-[#334155]">
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ol>
    <ul v-else class="m-0 grid list-disc gap-2 pl-5 text-sm font-semibold leading-7 text-[#334155]">
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
  </section>
</template>
