<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    status: string
    content: string
    placeholder?: string
    maxHeight?: number
  }>(),
  {
    placeholder: '等待 AI 返回第一段内容...',
    maxHeight: 240,
  },
)

const scroller = ref<HTMLElement | null>(null)
const pinnedToBottom = ref(true)

function isNearBottom(element: HTMLElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= 24
}

function scrollToBottom() {
  const element = scroller.value
  if (!element) return
  element.scrollTop = element.scrollHeight
}

function onScroll() {
  const element = scroller.value
  if (!element) return
  pinnedToBottom.value = isNearBottom(element)
}

watch(
  () => props.content,
  async (content, previousContent) => {
    if (!previousContent || content.length < previousContent.length) {
      pinnedToBottom.value = true
    }

    if (!pinnedToBottom.value) return
    await nextTick()
    scrollToBottom()
  },
  { flush: 'post' },
)

onMounted(async () => {
  await nextTick()
  scrollToBottom()
})
</script>

<template>
  <section class="section-card mb-4">
    <div class="mb-3 flex items-center justify-between gap-3">
      <strong class="text-sm text-indigo-600">{{ status }}</strong>
      <span class="soft-tag">流式生成</span>
    </div>
    <pre
      ref="scroller"
      class="soft-scrollbar m-0 overflow-auto whitespace-pre-wrap rounded-[14px] bg-white/70 p-4 text-xs leading-6 text-[#475569]"
      :style="{ maxHeight: `${maxHeight}px` }"
      @scroll="onScroll"
    >{{ content || placeholder }}</pre>
  </section>
</template>
