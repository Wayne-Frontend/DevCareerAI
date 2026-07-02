<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import FeedbackCard from '../FeedbackCard/index.vue'

const props = defineProps<{
  role: 'ai' | 'user' | 'system'
  content: string
  feedback?: {
    score: number
    comment: string
    problems?: string[]
    betterAnswer?: string
  }
  // 为 true 时 AI 消息按 Markdown 渲染（html 关闭以防 XSS）；用户/系统消息仍为纯文本。
  markdown?: boolean
}>()

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

const renderedContent = computed(() =>
  props.markdown && props.role === 'ai' ? md.render(props.content) : '',
)
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
      <!-- AI 内容为空 = 正在等待流式首包，显示打字动画避免"卡住"的观感 -->
      <div v-if="role === 'ai' && !content" class="typing-dots" aria-label="AI 正在思考">
        <span /><span /><span />
      </div>
      <div
        v-else-if="markdown && role === 'ai'"
        class="markdown-body text-sm leading-7 text-[#243044]"
        v-html="renderedContent"
      />
      <p v-else class="m-0 whitespace-pre-wrap text-sm leading-7 text-[#243044]" :class="{ 'text-white': role === 'user' }">{{ content }}</p>
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

<style scoped>
.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 2px;
}

.typing-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #818cf8;
  animation: typing-bounce 1.2s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    opacity: 0.4;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

.markdown-body :deep(> :first-child) {
  margin-top: 0;
}

.markdown-body :deep(> :last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(p) {
  margin: 8px 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 14px 0 6px;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0;
  padding-left: 22px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(li > p) {
  margin: 0;
}

.markdown-body :deep(strong) {
  font-weight: 800;
  color: #0f172a;
}

.markdown-body :deep(code) {
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.1);
  padding: 2px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  color: #4338ca;
}

.markdown-body :deep(pre) {
  margin: 10px 0;
  overflow-x: auto;
  border-radius: 12px;
  background: #0f172a;
  padding: 14px;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #e2e8f0;
}

.markdown-body :deep(blockquote) {
  margin: 10px 0;
  border-left: 3px solid rgba(99, 102, 241, 0.45);
  padding-left: 12px;
  color: #475569;
}

.markdown-body :deep(a) {
  color: #4f46e5;
  text-decoration: underline;
}

.markdown-body :deep(table) {
  margin: 10px 0;
  border-collapse: collapse;
  font-size: 13px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 6px 10px;
}

.markdown-body :deep(hr) {
  margin: 12px 0;
  border: 0;
  border-top: 1px solid rgba(148, 163, 184, 0.35);
}
</style>
