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
  <div class="grid min-h-[190px] place-items-center content-center gap-2.5 rounded-[20px] border border-dashed border-indigo-200/80 bg-white/45 p-6 text-center">
    <div class="icon-tile h-[56px] w-[56px] rounded-[18px] text-2xl">
      <Sparkles :size="26" />
    </div>
    <h3 class="m-0 text-base font-extrabold text-[#0f172a]">{{ title }}</h3>
    <p class="m-0 max-w-sm text-[13px] leading-6 text-[#64748b]">{{ description }}</p>
  </div>
</template>
