<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    score: number
    title?: string
    summary?: string
  }>(),
  {
    title: '综合评分',
    summary: '评分由 AI 基于当前输入生成，仅作为求职准备参考。',
  },
)

const safeScore = computed(() => Math.max(0, Math.min(100, props.score || 0)))
</script>

<template>
  <div class="grid grid-cols-[150px_1fr] items-center gap-7">
    <div
      class="grid h-[140px] w-[140px] place-items-center rounded-full p-[11px] shadow-[0_18px_38px_rgba(99,102,241,0.22)]"
      :style="{ background: `conic-gradient(#6d5dfc 0deg, #2f80ff ${safeScore * 3.6}deg, #edf2ff ${safeScore * 3.6}deg 360deg)` }"
    >
      <div class="grid h-full w-full place-items-center content-center rounded-full bg-white">
        <strong class="text-[42px] font-black leading-none text-[#13214a]">{{ safeScore }}</strong>
        <span class="mt-1 text-sm font-bold text-[#64748b]">/100</span>
      </div>
    </div>
    <div class="min-w-0">
      <h3 class="mb-3 mt-0 text-[22px] font-black text-[#0f172a]">{{ title }}</h3>
      <p class="mb-0 mt-0 text-sm leading-7 text-[#64748b]">{{ summary }}</p>
    </div>
  </div>
</template>
