<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Clock3, Mic, PlayCircle } from 'lucide-vue-next'
import ChatBox from '../../components/ChatBox/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import { createInterview, finishInterview, submitInterviewAnswer } from '../../api/interview'
import { useInterviewStore } from '../../stores/interview'
import { notify } from '../../utils/notify'

const interviewStore = useInterviewStore()
const loading = ref(false)
const form = reactive({
  resumeContent: '',
  jobDescription: '',
  targetRole: '前端开发工程师',
  interviewType: '项目面试',
  difficulty: '中等',
})

async function start() {
  if (!form.resumeContent.trim() || !form.targetRole.trim()) {
    notify('请填写简历内容和目标岗位', 'warning')
    return
  }

  loading.value = true
  try {
    const response = await createInterview({ ...form })
    interviewStore.startSession(response.sessionId, response.firstQuestion)
    notify('模拟面试已开始', 'success')
  } finally {
    loading.value = false
  }
}

async function sendAnswer(answer: string) {
  if (!interviewStore.sessionId) {
    notify('请先开始面试', 'warning')
    return
  }

  loading.value = true
  try {
    interviewStore.appendMessage({ id: crypto.randomUUID(), role: 'user', content: answer })
    const response = await submitInterviewAnswer(interviewStore.sessionId, answer)
    interviewStore.appendMessage({
      id: crypto.randomUUID(),
      role: 'ai',
      content: response.nextQuestion,
      feedback: {
        score: response.feedback.score,
        comment: response.feedback.comment,
        problems: response.feedback.problems,
        betterAnswer: response.feedback.betterAnswer,
      },
    })
  } finally {
    loading.value = false
  }
}

async function finish() {
  if (!interviewStore.sessionId) return

  loading.value = true
  try {
    const response = await finishInterview(interviewStore.sessionId)
    interviewStore.appendMessage({
      id: crypto.randomUUID(),
      role: 'system',
      content: `${response.summary}\n\n优势：${response.strengths.join('；')}\n待提升：${response.weaknesses.join('；')}\n学习计划：${response.studyPlan.join('；')}`,
    })
    notify('模拟面试已结束', 'success')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="flex items-center gap-4">
      <div class="icon-tile h-[60px] w-[60px] rounded-[18px]">
        <Mic :size="30" />
      </div>
      <div>
        <h1 class="m-0 text-[36px] font-black text-[#0f172a]">模拟面试</h1>
        <p class="mt-2 text-base font-semibold text-[#64748b]">根据简历和目标岗位生成问题、点评回答，并持续追问。</p>
      </div>
      <RouterLink class="btn-secondary ml-auto" to="/history">
        <Clock3 :size="18" />
        查看面试记录
      </RouterLink>
    </header>

    <div class="grid grid-cols-[340px_minmax(0,1fr)] items-start gap-4">
      <GlassCard>
        <h2 class="section-title">面试配置</h2>
        <div class="grid gap-4">
          <label>
            <span class="field-label">目标岗位</span>
            <input v-model="form.targetRole" class="input-base" />
          </label>
          <label>
            <span class="field-label">面试类型</span>
            <select v-model="form.interviewType" class="select-base">
              <option>项目面试</option>
              <option>技术面</option>
              <option>综合面</option>
            </select>
          </label>
          <label>
            <span class="field-label">难度</span>
            <select v-model="form.difficulty" class="select-base">
              <option>简单</option>
              <option>中等</option>
              <option>困难</option>
            </select>
          </label>
          <label>
            <span class="field-label">简历内容</span>
            <textarea v-model="form.resumeContent" class="textarea-base min-h-[160px]" placeholder="粘贴用于面试的简历或项目经历..." />
          </label>
          <label>
            <span class="field-label">岗位 JD（可选）</span>
            <textarea v-model="form.jobDescription" class="textarea-base min-h-[96px]" placeholder="粘贴 JD 后，问题会更贴近岗位要求。" />
          </label>
          <button class="btn-primary mt-2 w-full" :disabled="loading" @click="start">
            <PlayCircle :size="18" />
            {{ loading ? '启动中...' : '开始面试' }}
          </button>
          <button class="btn-secondary w-full" :disabled="!interviewStore.sessionId || loading" @click="finish">结束面试</button>
        </div>
      </GlassCard>

      <GlassCard>
        <div class="mb-3 flex justify-between gap-4">
          <div>
            <h2 class="mb-1.5 mt-0 flex items-center gap-2 text-xl font-black text-[#0f172a]">
              <Mic :size="20" class="text-indigo-500" />
              AI 面试官
            </h2>
            <p class="m-0 text-sm text-[#64748b]">每次回答后会生成点评、参考回答和下一道追问。</p>
          </div>
          <span class="soft-tag">{{ form.difficulty }}</span>
        </div>
        <ChatBox :messages="interviewStore.messages" :loading="loading" @send-answer="sendAnswer" />
      </GlassCard>
    </div>
  </div>
</template>
