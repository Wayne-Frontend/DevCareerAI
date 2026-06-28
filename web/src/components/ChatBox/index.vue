<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Send } from 'lucide-vue-next'
import type { ChatMessage } from '../../types/interview'
import EmptyState from '../EmptyState/index.vue'
import ChatMessageItem from '../ChatMessage/index.vue'

const props = defineProps<{
  messages: ChatMessage[]
  loading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  sendAnswer: [answer: string]
}>()

const answer = ref('')
const answerTextarea = ref<HTMLTextAreaElement | null>(null)
const messageScroller = ref<HTMLElement | null>(null)
const pinnedToBottom = ref(true)
const maxAnswerHeight = 150
const canSend = computed(() => Boolean(answer.value.trim()) && !props.loading && !props.disabled)

function isNearBottom(element: HTMLElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= 24
}

function scrollToBottom() {
  const element = messageScroller.value
  if (!element) return
  element.scrollTop = element.scrollHeight
}

function onMessagesScroll() {
  const element = messageScroller.value
  if (!element) return
  pinnedToBottom.value = isNearBottom(element)
}

function send() {
  if (!canSend.value) return

  const value = answer.value.trim()
  emit('sendAnswer', value)
  answer.value = ''
  void nextTick(resizeAnswerTextarea)
}

function resizeAnswerTextarea() {
  const element = answerTextarea.value
  if (!element) return
  element.style.height = 'auto'
  const nextHeight = Math.min(element.scrollHeight, maxAnswerHeight)
  element.style.height = `${nextHeight}px`
  element.style.overflowY = element.scrollHeight > maxAnswerHeight ? 'auto' : 'hidden'
}

watch(
  () => props.messages.length,
  async (length, previousLength) => {
    if (length === 0 || length < previousLength) {
      pinnedToBottom.value = true
    }

    if (!pinnedToBottom.value) return
    await nextTick()
    scrollToBottom()
  },
  { flush: 'post' },
)

watch(answer, async () => {
  await nextTick()
  resizeAnswerTextarea()
})

onMounted(async () => {
  await nextTick()
  resizeAnswerTextarea()
  scrollToBottom()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div ref="messageScroller" class="soft-scrollbar grid min-h-0 flex-1 content-start gap-4 overflow-auto px-1 pb-4" @scroll="onMessagesScroll">
      <EmptyState
        v-if="messages.length === 0"
        title="准备开始"
        description="左侧配置完成后，AI 面试官会在这里生成第一道问题。"
      />
      <ChatMessageItem
        v-for="message in messages"
        v-else
        :key="message.id"
        :role="message.role"
        :content="message.content"
        :feedback="message.feedback"
      />
    </div>

    <div class="shrink-0 border-t border-white/60 bg-gradient-to-t from-white/95 via-white/82 to-white/20 px-1 pt-4 backdrop-blur-xl">
      <div class="grid grid-cols-[1fr_58px] items-center gap-4">
        <div class="flex min-h-[64px] max-h-[184px] items-end rounded-[28px] border border-indigo-300/80 bg-white/86 px-7 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_30px_rgba(79,70,229,0.08)] backdrop-blur-xl">
          <textarea
            ref="answerTextarea"
            v-model="answer"
            class="soft-scrollbar min-h-8 flex-1 resize-none border-0 bg-transparent py-1 text-sm font-semibold leading-6 text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
            maxlength="1500"
            placeholder="请输入你的回答..."
            rows="1"
            :disabled="loading || disabled"
            @input="resizeAnswerTextarea"
            @keydown.ctrl.enter.prevent="send"
          />
          <span class="mb-1 shrink-0 text-xs font-bold text-[#64748b]">{{ answer.length }}/1500</span>
        </div>
        <button
          class="grid h-[58px] w-[58px] place-items-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-[0_18px_36px_rgba(99,102,241,0.35)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canSend"
          aria-label="发送回答"
          @click="send"
        >
          <Send :size="18" />
        </button>
      </div>
      <span class="ml-1 mt-2 block text-xs text-[#94a3b8]">{{ disabled ? '当前面试已结束' : loading ? 'AI 思考中，请稍候' : '按 Ctrl + Enter 发送' }}</span>
    </div>
  </div>
</template>
