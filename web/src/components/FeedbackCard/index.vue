<script setup lang="ts">
defineProps<{
  score: number
  comment: string
  problems?: string[]
  betterAnswer?: string
}>()
</script>

<template>
  <div class="grid grid-cols-[86px_1fr] gap-3.5 rounded-[18px] border border-indigo-200/70 bg-indigo-50/70 p-3.5">
    <div class="grid min-h-[74px] place-items-center rounded-2xl bg-white/75">
      <strong class="text-[28px] leading-none text-indigo-600">{{ score }}</strong>
      <span class="text-xs text-[#64748b]">点评分</span>
    </div>
    <div>
      <p class="m-0 text-sm leading-7 text-[#334155]">{{ comment }}</p>
      <ul v-if="problems?.length" class="mb-0 mt-2 list-disc pl-5 text-sm leading-7 text-[#475569]">
        <li v-for="problem in problems" :key="problem">{{ problem }}</li>
      </ul>
      <div v-if="betterAnswer" class="mt-3 rounded-2xl bg-white/70 p-3">
        <span class="mb-1.5 block text-xs font-extrabold text-indigo-600">参考回答</span>
        <p class="m-0 whitespace-pre-wrap text-sm leading-7 text-[#334155]">{{ betterAnswer }}</p>
      </div>
    </div>
  </div>
</template>
