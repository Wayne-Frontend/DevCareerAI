<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: '等待开始',
    description: '填写信息后，这里会展示 AI 生成的结构化结果。',
  },
)
</script>

<template>
  <div class="grid min-h-[240px] place-items-center content-center gap-3 rounded-3xl border border-dashed border-indigo-200/80 bg-white/45 p-8 text-center">
    <div class="icon-tile h-[72px] w-[72px] rounded-[22px] text-3xl">
      <Sparkles :size="32" />
    </div>
    <h3 class="m-0 text-lg font-extrabold text-[#0f172a]">{{ title }}</h3>
    <p class="m-0 max-w-sm text-sm leading-7 text-[#64748b]">{{ description }}</p>
  </div>
</template>
