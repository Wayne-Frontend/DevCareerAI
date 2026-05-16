<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description: string
}>()
</script>

<template>
  <article class="glass-card flex h-[260px] flex-col p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_60px_rgba(15,23,42,0.1)]">
    <div class="icon-tile h-[58px] w-[58px] rounded-[18px] text-[28px]">
      <component :is="icon" :size="28" stroke-width="1.9" />
    </div>
    <h2 class="mb-3 mt-6 text-[19px] font-extrabold tracking-normal text-[#0f172a]">{{ title }}</h2>
    <p class="mb-5 flex-1 text-sm leading-7 text-[#64748b]">{{ description }}</p>
    <slot />
  </article>
</template>
