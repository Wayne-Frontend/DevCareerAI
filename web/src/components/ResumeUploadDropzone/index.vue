<script setup lang="ts">
import { UploadCloud } from 'lucide-vue-next'

defineProps<{
  uploading: boolean
  disabled?: boolean
  selectedFileName?: string
}>()

const emit = defineEmits<{
  change: [event: Event]
}>()
</script>

<template>
  <label
    class="mb-4 grid min-h-[96px] cursor-pointer place-items-center rounded-[14px] border border-dashed border-indigo-200 bg-white/45 p-4 text-center transition focus-within:border-indigo-400 hover:border-indigo-300 hover:bg-indigo-50/40"
    :class="{ 'pointer-events-none opacity-70': uploading || disabled }"
  >
    <input
      class="sr-only"
      type="file"
      accept=".pdf,.docx,.txt,.md"
      :disabled="uploading || disabled"
      @change="emit('change', $event)"
    />
    <UploadCloud :size="32" class="text-indigo-500" />
    <span class="mt-2 block text-sm font-extrabold text-[#26324f]">{{
      uploading ? '解析中...' : '上传 PDF / DOCX / TXT / MD'
    }}</span>
    <span
      v-if="selectedFileName"
      class="mt-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600"
      >{{ selectedFileName }}</span
    >
  </label>
</template>
