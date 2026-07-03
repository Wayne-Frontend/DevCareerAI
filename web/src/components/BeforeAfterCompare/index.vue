<script setup lang="ts">
defineProps<{
  list: Array<{
    before: string
    after: string
    reason?: string
  }>
}>()
</script>

<template>
  <div class="grid gap-3">
    <p
      v-if="list.length === 0"
      class="m-0 rounded-2xl border border-dashed border-indigo-200 bg-white/50 p-6 text-center text-sm text-[#94a3b8]"
    >
      暂无优化示例
    </p>
    <div
      v-for="item in list"
      v-else
      :key="item.before + item.after"
      class="grid grid-cols-2 gap-3 rounded-[20px] border border-[rgba(148,163,184,0.22)] bg-white/60 p-3.5"
    >
      <div class="rounded-2xl border border-red-200 bg-red-50/60 p-3.5">
        <span class="danger-tag">Before</span>
        <p class="mb-0 mt-3 text-sm leading-7 text-[#334155]">{{ item.before }}</p>
      </div>
      <div class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
        <span class="success-tag">After</span>
        <p class="mb-0 mt-3 text-sm leading-7 text-[#334155]">{{ item.after }}</p>
      </div>
      <small
        v-if="item.reason"
        class="col-span-2 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold leading-6 text-indigo-600"
      >
        {{ item.reason }}
      </small>
    </div>
  </div>
</template>
