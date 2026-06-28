<script setup lang="ts">
withDefaults(
  defineProps<{
    tags: string[]
    type?: 'success' | 'warning' | 'danger' | 'info'
  }>(),
  {
    type: 'info',
  },
)
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <span
      v-for="tag in tags"
      :key="tag"
      class="inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-extrabold"
      :class="{
        'border-emerald-200 bg-emerald-50 text-emerald-700': type === 'success',
        'border-amber-200 bg-amber-50 text-amber-700': type === 'warning',
        'border-red-200 bg-red-50 text-red-600': type === 'danger',
        'border-indigo-200 bg-indigo-50 text-indigo-600': type === 'info',
      }"
    >
      {{ tag }}
    </span>
    <p v-if="tags.length === 0" class="m-0 text-sm text-[#94a3b8]">暂无关键词</p>
  </div>
</template>
