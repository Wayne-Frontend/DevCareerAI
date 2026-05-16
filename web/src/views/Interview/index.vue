<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue'
import { Clock3, Mic, PlayCircle, Square, UploadCloud } from 'lucide-vue-next'
import ChatBox from '../../components/ChatBox/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import StreamPreview from '../../components/StreamPreview/index.vue'
import { createInterviewStream, finishInterviewStream, submitInterviewAnswerStream } from '../../api/interview'
import { uploadResume } from '../../api/resume'
import { useInterviewStore } from '../../stores/interview'
import { notify } from '../../utils/notify'

const MAX_RESUME_LENGTH = 20000
const interviewStore = useInterviewStore()
const loading = ref(false)
const uploadLoading = ref(false)
const selectedFileName = ref('')
const streamPreview = ref('')
const streamStatus = ref('')
const controller = ref<AbortController | null>(null)

const form = reactive({
  resumeContent: '',
  jobDescription: '',
  targetRole: '前端开发工程师',
  interviewType: '项目面试',
  difficulty: '中等',
})

onBeforeUnmount(() => {
  controller.value?.abort()
})

async function onResumeFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadLoading.value = true
  try {
    const parsed = await uploadResume(file)
    selectedFileName.value = parsed.fileName
    form.resumeContent = parsed.content.slice(0, MAX_RESUME_LENGTH)
    notify(parsed.truncated || parsed.content.length > MAX_RESUME_LENGTH ? '文件已解析，内容较长，已自动截断' : '文件已解析', 'success')
  } catch {
    input.value = ''
  } finally {
    uploadLoading.value = false
  }
}

async function start() {
  if (!form.resumeContent.trim() || !form.targetRole.trim()) {
    notify('请填写简历内容和目标岗位', 'warning')
    return
  }

  await runStream('AI 正在生成第一道面试题', async (signal) => {
    const response = await createInterviewStream(
      { ...form },
      {
        signal,
        onStart: () => {
          streamStatus.value = 'AI 正在启动模拟面试'
        },
        onDelta: appendDelta,
      },
    )
    interviewStore.startSession(response.sessionId, response.firstQuestion)
    notify(response.cached ? '命中缓存，模拟面试已开始' : '模拟面试已开始', 'success')
  })
}

async function sendAnswer(answer: string) {
  if (!interviewStore.sessionId) {
    notify('请先开始面试', 'warning')
    return
  }

  interviewStore.appendMessage({ id: crypto.randomUUID(), role: 'user', content: answer })

  await runStream('AI 正在点评回答并生成追问', async (signal) => {
    const response = await submitInterviewAnswerStream(interviewStore.sessionId, answer, {
      signal,
      onStart: () => {
        streamStatus.value = 'AI 正在分析你的回答'
      },
      onDelta: appendDelta,
    })
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
  })
}

async function finish() {
  if (!interviewStore.sessionId) return

  await runStream('AI 正在生成面试总结', async (signal) => {
    const response = await finishInterviewStream(interviewStore.sessionId, {
      signal,
      onStart: () => {
        streamStatus.value = 'AI 正在整理面试记录'
      },
      onDelta: appendDelta,
    })
    interviewStore.appendMessage({
      id: crypto.randomUUID(),
      role: 'system',
      content: `${response.summary}\n\n优势：${response.strengths.join('；')}\n待提升：${response.weaknesses.join('；')}\n学习计划：${response.studyPlan.join('；')}`,
    })
    notify(response.cached ? '命中缓存，模拟面试已结束' : '模拟面试已结束', 'success')
  })
}

async function runStream(initialStatus: string, runner: (signal: AbortSignal) => Promise<void>) {
  controller.value = new AbortController()
  loading.value = true
  streamPreview.value = ''
  streamStatus.value = initialStatus

  try {
    await runner(controller.value.signal)
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      notify('已取消本次生成', 'info')
    }
  } finally {
    loading.value = false
    controller.value = null
    streamStatus.value = ''
  }
}

function appendDelta(delta: string) {
  streamStatus.value = 'AI 正在流式生成'
  streamPreview.value += delta
}

function cancelStream() {
  controller.value?.abort()
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

    <div class="feature-workspace-compact">
      <GlassCard class="feature-pane-left">
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
          <div>
            <span class="field-label">简历内容</span>
            <label class="mb-3 grid min-h-[104px] cursor-pointer place-items-center rounded-[18px] border border-dashed border-indigo-200 bg-white/45 p-4 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
              <input class="hidden" type="file" accept=".pdf,.docx,.txt,.md" @change="onResumeFileChange" />
              <UploadCloud :size="30" class="text-indigo-500" />
              <span class="mt-2 block text-sm font-extrabold text-[#26324f]">{{ uploadLoading ? '解析中...' : '上传 PDF / DOCX / TXT / MD' }}</span>
              <span v-if="selectedFileName" class="mt-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">{{ selectedFileName }}</span>
            </label>
            <textarea v-model="form.resumeContent" class="textarea-base min-h-[150px]" :maxlength="MAX_RESUME_LENGTH" placeholder="粘贴或上传用于面试的简历、项目经历..." />
            <span class="mt-1 block text-right text-xs text-[#64748b]">{{ form.resumeContent.length }} / {{ MAX_RESUME_LENGTH }}</span>
          </div>
          <label>
            <span class="field-label">岗位 JD（可选）</span>
            <textarea v-model="form.jobDescription" class="textarea-base min-h-[96px]" placeholder="粘贴 JD 后，问题会更贴近岗位要求。" />
          </label>
          <button class="btn-primary mt-2 w-full" :disabled="loading || uploadLoading" @click="start">
            <PlayCircle :size="18" />
            {{ loading ? '生成中...' : '开始面试' }}
          </button>
          <button class="btn-secondary w-full" :disabled="!interviewStore.sessionId || loading" @click="finish">结束面试</button>
          <button v-if="loading" class="btn-secondary w-full" @click="cancelStream">
            <Square :size="16" />
            取消本次生成
          </button>
        </div>
      </GlassCard>

      <GlassCard class="feature-pane-right soft-scrollbar">
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

        <StreamPreview v-if="loading" :status="streamStatus" :content="streamPreview" :max-height="180" />

        <ChatBox :messages="interviewStore.messages" :loading="loading" @send-answer="sendAnswer" />
      </GlassCard>
    </div>
  </div>
</template>
