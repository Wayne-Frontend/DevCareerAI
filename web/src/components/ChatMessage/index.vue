<script setup lang="ts">
import FeedbackCard from '../FeedbackCard/index.vue'

defineProps<{
  role: 'ai' | 'user' | 'system'
  content: string
  feedback?: {
    score: number
    comment: string
    problems?: string[]
    betterAnswer?: string
  }
}>()
</script>

<template>
  <div
    class="flex items-start gap-3"
    :class="{
      'flex-row-reverse': role === 'user',
      'justify-center': role === 'system',
    }"
  >
    <div
      v-if="role !== 'system'"
      class="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-white/75 text-xs font-black text-indigo-600 shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
      :class="{ 'bg-gradient-to-br from-violet-500 to-blue-500 text-white': role === 'user' }"
    >
      {{ role === 'user' ? '我' : 'AI' }}
    </div>
    <div
      class="max-w-[78%] rounded-[20px] border border-[rgba(148,163,184,0.22)] bg-white/75 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
      :class="{
        'border-transparent bg-gradient-to-br from-violet-500 to-blue-500': role === 'user',
        'max-w-[72%] bg-slate-900/5 text-center': role === 'system',
      }"
    >
      <p class="m-0 whitespace-pre-wrap text-sm leading-7 text-[#243044]" :class="{ 'text-white': role === 'user' }">{{ content }}</p>
      <FeedbackCard
        v-if="feedback"
        class="mt-3"
        :score="feedback.score"
        :comment="feedback.comment"
        :problems="feedback.problems"
        :better-answer="feedback.betterAnswer"
      />
    </div>
  </div>
</template>
