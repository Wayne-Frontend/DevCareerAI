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
  <div class="grid grid-cols-[118px_1fr] items-center gap-5">
    <div
      class="grid h-[112px] w-[112px] place-items-center rounded-full p-2 shadow-[0_14px_28px_rgba(99,102,241,0.18)]"
      :style="{ background: `conic-gradient(#6d5dfc 0deg, #2f80ff ${safeScore * 3.6}deg, #edf2ff ${safeScore * 3.6}deg 360deg)` }"
    >
      <div class="grid h-full w-full place-items-center content-center rounded-full bg-white">
        <strong class="text-[32px] font-black leading-none text-[#13214a]">{{ safeScore }}</strong>
        <span class="mt-0.5 text-xs font-bold text-[#64748b]">/100</span>
      </div>
    </div>
    <div class="min-w-0">
      <h3 class="mb-2 mt-0 text-[18px] font-black text-[#0f172a]">{{ title }}</h3>
      <p class="mb-0 mt-0 text-[13px] leading-6 text-[#64748b]">{{ summary }}</p>
    </div>
  </div>
</template>
