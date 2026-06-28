<script setup lang="ts">
defineProps<{
  title: string
  items: string[]
}>()
</script>

<template>
  <section class="section-card">
    <h3 class="mb-3 mt-0 text-[15px] font-extrabold text-[#0f172a]">{{ title }}</h3>
    <p v-if="items.length === 0" class="m-0 text-sm text-[#94a3b8]">暂无内容</p>
    <ul v-else class="m-0 grid list-none gap-2 p-0 text-sm leading-7 text-[#334155]">
      <li v-for="item in items" :key="item" class="grid grid-cols-[10px_1fr] items-start gap-2.5">
        <span class="mt-2.5 h-2 w-2 rounded-full bg-gradient-to-br from-violet-500 to-blue-500" />
        <span>{{ item }}</span>
      </li>
    </ul>
  </section>
</template>
