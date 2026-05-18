<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description: string
}>()
</script>

<template>
  <article class="glass-card flex h-[220px] flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.08)]">
    <div class="icon-tile h-[48px] w-[48px] rounded-[15px] text-[22px]">
      <component :is="icon" :size="22" stroke-width="1.9" />
    </div>
    <h2 class="mb-2.5 mt-4 text-[16px] font-extrabold tracking-normal text-[#0f172a]">{{ title }}</h2>
    <p class="mb-4 flex-1 text-[13px] leading-6 text-[#64748b]">{{ description }}</p>
    <slot />
  </article>
</template>
