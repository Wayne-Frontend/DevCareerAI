<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Clock3, Copy, Mic, PlayCircle, Square, UploadCloud } from 'lucide-vue-next'
import ChatBox from '../../components/ChatBox/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import InlineStatus from '../../components/InlineStatus/index.vue'
import StreamPreview from '../../components/StreamPreview/index.vue'
import { createInterviewStream, finishInterviewStream, submitInterviewAnswerStream } from '../../api/interview'
import { getJobDescriptions } from '../../api/job'
import { getResumes, uploadResume } from '../../api/resume'
import { useInterviewStore } from '../../stores/interview'
import { useWorkflowStore } from '../../stores/workflow'
import type { JobDescriptionRecord } from '../../types/job'
import type { ResumeRecord } from '../../types/resume'
import { messageBox } from '../../utils/messageBox'
import { notify } from '../../utils/notify'
import { buildInterviewStudyPlanCopy } from '../../utils/resultCopy'

const MAX_RESUME_LENGTH = 20000
const interviewStore = useInterviewStore()
const workflowStore = useWorkflowStore()
const route = useRoute()
const loading = ref(false)
const uploadLoading = ref(false)
const assetsLoading = ref(false)
const selectedFileName = ref('')
const streamPreview = ref('')
const streamStatus = ref('')
const errorMessage = ref('')
const uploadError = ref('')
const assetsError = ref('')
const workflowMessage = ref('')
const finalSummary = ref<unknown>(null)
const controller = ref<AbortController | null>(null)
const resumeOptions = ref<ResumeRecord[]>([])
const jobOptions = ref<JobDescriptionRecord[]>([])
const selectedResumeId = ref('')
const selectedJobDescriptionId = ref('')
const queryApplied = ref(false)

const form = reactive({
  resumeContent: '',
  jobDescription: '',
  targetRole: '前端开发工程师',
  interviewType: '项目面试',
  difficulty: '中等',
})

const interviewStatus = computed(() => {
  if (interviewStore.finished) return '面试已结束'
  if (loading.value) return 'AI 思考中'
  if (interviewStore.sessionId) return '面试进行中'
  return '等待开始'
})

onBeforeUnmount(() => {
  controller.value?.abort()
})

onMounted(async () => {
  await loadAssets()
  applyWorkflowContext()
})

async function loadAssets() {
  assetsLoading.value = true
  assetsError.value = ''
  try {
    const [resumes, jobs] = await Promise.all([getResumes(), getJobDescriptions()])
    resumeOptions.value = resumes
    jobOptions.value = jobs
    applyFromQuery()
  } catch {
    assetsError.value = '已有简历或 JD 加载失败，你仍可以手动输入内容。'
    notify('已有资料加载失败，可手动填写后继续面试', 'warning')
  } finally {
    assetsLoading.value = false
  }
}

function readQueryId(key: 'resumeId' | 'jdId') {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

function applyFromQuery() {
  if (queryApplied.value) return
  queryApplied.value = true

  const resumeId = readQueryId('resumeId')
  if (resumeId) {
    if (resumeOptions.value.some((item) => item.id === resumeId)) {
      applyResume(resumeId)
      workflowMessage.value = '已带入简历管理中的简历，可直接开始模拟面试。'
    } else {
      notify('指定简历加载失败，可手动选择或填写后继续面试', 'warning')
    }
  }

  const jdId = readQueryId('jdId')
  if (jdId) {
    if (jobOptions.value.some((item) => item.id === jdId)) {
      applyJobDescription(jdId)
      workflowMessage.value = '已带入 JD 管理中的岗位描述，可直接开始模拟面试。'
    } else {
      notify('指定 JD 加载失败，可手动选择或填写后继续面试', 'warning')
    }
  }
}

function applyResume(id: string) {
  selectedResumeId.value = id
  const resume = resumeOptions.value.find((item) => item.id === id)
  if (!resume) return
  form.resumeContent = resume.content.slice(0, MAX_RESUME_LENGTH)
  form.targetRole = resume.targetRole || form.targetRole
  uploadError.value = ''
}

function applyJobDescription(id: string) {
  selectedJobDescriptionId.value = id
  const job = jobOptions.value.find((item) => item.id === id)
  if (!job) return
  form.jobDescription = job.content
  form.targetRole = job.jobTitle || form.targetRole
}

function applyWorkflowContext() {
  const context = workflowStore.consumeInterviewContext()
  if (!context) return

  let applied = false
  if (context.targetRole && (!form.targetRole.trim() || form.targetRole === '前端开发工程师')) {
    form.targetRole = context.targetRole
    applied = true
  }
  if (context.resumeContent && !form.resumeContent.trim()) {
    form.resumeContent = context.resumeContent.slice(0, MAX_RESUME_LENGTH)
    applied = true
  }
  if (context.projectContext && !form.resumeContent.trim()) {
    form.resumeContent = context.projectContext.slice(0, MAX_RESUME_LENGTH)
    applied = true
  } else if (context.projectContext && form.resumeContent.trim() && !form.resumeContent.includes(context.projectContext.slice(0, 80))) {
    form.resumeContent = `${form.resumeContent}\n\n${context.projectContext}`.slice(0, MAX_RESUME_LENGTH)
    applied = true
  }
  if (context.jobDescription && !form.jobDescription.trim()) {
    form.jobDescription = context.jobDescription
    applied = true
  }

  if (applied) {
    selectedResumeId.value = ''
    selectedJobDescriptionId.value = ''
    workflowMessage.value = `已带入${context.sourceLabel || '上一步'}资料，可直接开始模拟面试。`
  }
}

async function onResumeFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (form.resumeContent.trim()) {
    const confirmed = await messageBox.confirm({
      type: 'warning',
      title: '替换当前简历内容？',
      message: '上传新文件会覆盖当前用于面试的简历或项目经历内容。',
      confirmText: '继续上传',
    })
    if (!confirmed) {
      input.value = ''
      return
    }
  }

  uploadLoading.value = true
  uploadError.value = ''
  errorMessage.value = ''
  try {
    const parsed = await uploadResume(file)
    selectedResumeId.value = ''
    selectedFileName.value = parsed.fileName
    form.resumeContent = parsed.content.slice(0, MAX_RESUME_LENGTH)
    notify(parsed.truncated || parsed.content.length > MAX_RESUME_LENGTH ? '文件已解析，内容较长，已自动截断' : '文件已解析', 'success')
  } catch {
    input.value = ''
    uploadError.value = '文件解析失败，请确认格式为 PDF、DOCX、TXT 或 MD 后重试。'
  } finally {
    uploadLoading.value = false
    input.value = ''
  }
}

async function start() {
  if (loading.value || uploadLoading.value) return

  if (!form.resumeContent.trim() || !form.targetRole.trim()) {
    errorMessage.value = '请填写简历内容和目标岗位后再开始面试。'
    notify('请填写简历内容和目标岗位', 'warning')
    return
  }

  errorMessage.value = ''
  await runStream('AI 正在生成第一道面试题', async (signal) => {
    const response = await createInterviewStream(
      {
        ...form,
        resumeId: selectedResumeId.value || undefined,
        jobDescriptionId: selectedJobDescriptionId.value || undefined,
      },
      {
        signal,
        onStart: () => {
          streamStatus.value = 'AI 正在启动模拟面试'
        },
        onDelta: appendDelta,
      },
    )
    interviewStore.startSession(response.sessionId, response.firstQuestion)
    notify(
      response.meta?.status === 'parse_error'
        ? 'AI 结果格式异常，已保留原文整理结果'
        : response.cached
          ? '命中缓存，模拟面试已开始'
          : '模拟面试已开始',
      response.meta?.status === 'parse_error' ? 'warning' : 'success',
    )
  })
}

async function sendAnswer(answer: string) {
  if (!interviewStore.sessionId) {
    errorMessage.value = '请先开始面试，再提交回答。'
    notify('请先开始面试', 'warning')
    return
  }

  if (interviewStore.finished) {
    notify('当前面试已结束，不能继续回答', 'warning')
    return
  }

  errorMessage.value = ''
  const userMessageId = crypto.randomUUID()
  interviewStore.appendMessage({ id: userMessageId, role: 'user', content: answer })

  const succeeded = await runStream('AI 正在点评回答并生成追问', async (signal) => {
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
    if (response.meta?.status === 'parse_error') {
      notify('AI 结果格式异常，已保留原文整理结果', 'warning')
    }
  })

  if (!succeeded) {
    interviewStore.removeMessage(userMessageId)
  }
}

async function finish() {
  if (!interviewStore.sessionId || loading.value) return

  await runStream('AI 正在生成面试总结', async (signal) => {
    const response = await finishInterviewStream(interviewStore.sessionId, {
      signal,
      onStart: () => {
        streamStatus.value = 'AI 正在整理面试记录'
      },
      onDelta: appendDelta,
    })
    finalSummary.value = response
    interviewStore.appendMessage({
      id: crypto.randomUUID(),
      role: 'system',
      content: `${response.summary}\n\n优势：${response.strengths.join('；')}\n待提升：${response.weaknesses.join('；')}\n学习计划：${response.studyPlan.join('；')}`,
    })
    interviewStore.finishSession()
    notify(
      response.meta?.status === 'parse_error'
        ? 'AI 结果格式异常，已保留原文整理结果'
        : response.cached
          ? '命中缓存，模拟面试已结束'
          : '模拟面试已结束',
      response.meta?.status === 'parse_error' ? 'warning' : 'success',
    )
  })
}

async function runStream(initialStatus: string, runner: (signal: AbortSignal) => Promise<void>) {
  controller.value = new AbortController()
  loading.value = true
  streamPreview.value = ''
  streamStatus.value = initialStatus
  errorMessage.value = ''

  try {
    await runner(controller.value.signal)
    return true
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      notify('已取消本次生成', 'info')
    } else {
      errorMessage.value = 'AI 生成失败，请稍后重试。'
    }
    return false
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

const studyPlanText = computed(() => (finalSummary.value ? buildInterviewStudyPlanCopy(finalSummary.value) : ''))

function cancelStream() {
  controller.value?.abort()
}

async function copyStudyPlan() {
  if (!studyPlanText.value) return
  try {
    await navigator.clipboard.writeText(studyPlanText.value)
    notify('已复制学习计划', 'success')
  } catch {
    errorMessage.value = '复制失败，请检查浏览器剪贴板权限后重试。'
    notify('复制失败', 'error')
  }
}
</script>

<template>
  <div class="page page-viewport">
    <header class="flex items-center gap-4">
      <div class="icon-tile">
        <Mic :size="23" />
      </div>
      <div>
        <h1 class="m-0 text-[26px] font-black text-[#0f172a]">模拟面试</h1>
        <p class="mt-1.5 text-sm font-semibold text-[#64748b]">根据简历和目标岗位生成问题、点评回答，并持续追问。</p>
      </div>
      <RouterLink class="btn-secondary ml-auto" to="/history">
        <Clock3 :size="18" />
        查看面试记录
      </RouterLink>
    </header>

    <InlineStatus v-if="assetsError" type="warning" title="资料加载失败" :description="assetsError" />

    <div class="feature-workspace-compact">
      <GlassCard class="feature-pane-left">
        <h2 class="section-title">面试配置</h2>
        <InlineStatus v-if="assetsLoading" class="mb-4" type="loading" title="正在加载已有资料" description="稍等一下，简历和 JD 记录马上回来。" />
        <InlineStatus v-if="workflowMessage" class="mb-4" type="success" title="资料已带入" :description="workflowMessage" />
        <div class="grid gap-3">
          <label>
            <span class="field-label">目标岗位</span>
            <input v-model="form.targetRole" class="input-base" :disabled="loading" />
          </label>
          <label>
            <span class="field-label">面试类型</span>
            <select v-model="form.interviewType" class="select-base" :disabled="loading">
              <option>项目面试</option>
              <option>技术面</option>
              <option>综合面</option>
            </select>
          </label>
          <label>
            <span class="field-label">难度</span>
            <select v-model="form.difficulty" class="select-base" :disabled="loading">
              <option>简单</option>
              <option>中等</option>
              <option>困难</option>
            </select>
          </label>
          <div>
            <span class="field-label">简历内容</span>
            <label v-if="resumeOptions.length" class="mb-3 block">
              <select v-model="selectedResumeId" class="select-base" :disabled="loading || uploadLoading" @change="applyResume(selectedResumeId)">
                <option value="">手动输入 / 上传新简历</option>
                <option v-for="resume in resumeOptions" :key="resume.id" :value="resume.id">{{ resume.title }}</option>
              </select>
            </label>
            <label class="mb-3 grid min-h-[90px] cursor-pointer place-items-center rounded-[14px] border border-dashed border-indigo-200 bg-white/45 p-3.5 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40" :class="{ 'pointer-events-none opacity-70': uploadLoading || loading }">
              <input class="hidden" type="file" accept=".pdf,.docx,.txt,.md" :disabled="uploadLoading || loading" @change="onResumeFileChange" />
              <UploadCloud :size="30" class="text-indigo-500" />
              <span class="mt-2 block text-sm font-extrabold text-[#26324f]">{{ uploadLoading ? '解析中...' : '上传 PDF / DOCX / TXT / MD' }}</span>
              <span v-if="selectedFileName" class="mt-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">{{ selectedFileName }}</span>
            </label>
            <InlineStatus v-if="uploadError" class="mb-3" type="error" title="上传失败" :description="uploadError" />
            <textarea v-model="form.resumeContent" class="textarea-base min-h-[120px]" :maxlength="MAX_RESUME_LENGTH" placeholder="粘贴或上传用于面试的简历、项目经历..." :disabled="loading || uploadLoading" @input="selectedResumeId = ''" />
            <span class="mt-1 block text-right text-xs text-[#64748b]">{{ form.resumeContent.length }} / {{ MAX_RESUME_LENGTH }}</span>
          </div>
          <label>
            <span class="field-label">岗位 JD（可选）</span>
            <select v-if="jobOptions.length" v-model="selectedJobDescriptionId" class="select-base mb-3" :disabled="loading" @change="applyJobDescription(selectedJobDescriptionId)">
              <option value="">手动输入新 JD</option>
              <option v-for="job in jobOptions" :key="job.id" :value="job.id">{{ job.companyName ? `${job.companyName} - ${job.jobTitle}` : job.jobTitle }}</option>
            </select>
            <textarea v-model="form.jobDescription" class="textarea-base min-h-[60px]" placeholder="粘贴 JD 后，问题会更贴近岗位要求。" :disabled="loading" @input="selectedJobDescriptionId = ''" />
          </label>
          <InlineStatus v-if="errorMessage" type="error" title="面试暂时无法继续" :description="errorMessage" />
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

      <GlassCard class="feature-pane-right flex min-h-0 flex-col overflow-hidden">
        <div class="shrink-0 border-b border-white/60 bg-white/70 pb-4 backdrop-blur-xl">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="mb-1.5 mt-0 flex items-center gap-2 text-lg font-black text-[#0f172a]">
                <Mic :size="18" class="text-indigo-500" />
                AI 面试官
              </h2>
              <p class="m-0 text-xs text-[#64748b]">每次回答后会生成点评、参考回答和下一道追问。</p>
            </div>
            <div class="flex flex-wrap justify-end gap-2">
              <span class="soft-tag">{{ interviewStatus }}</span>
              <span class="soft-tag">{{ form.difficulty }}</span>
              <button v-if="loading" class="btn-secondary min-h-10" @click="cancelStream">
                <Square :size="16" />
                取消生成
              </button>
              <button v-else-if="interviewStore.sessionId && !interviewStore.finished" class="btn-secondary min-h-10" @click="finish">结束面试</button>
              <button v-if="interviewStore.finished" class="btn-secondary min-h-10" :disabled="!studyPlanText" @click="copyStudyPlan">
                <Copy :size="18" />
                复制学习计划
              </button>
              <RouterLink v-if="interviewStore.finished" class="btn-secondary min-h-10" to="/history">
                <Clock3 :size="18" />
                查看复盘记录
              </RouterLink>
            </div>
          </div>

          <InlineStatus v-if="loading" class="mt-4" type="loading" title="AI 正在生成" :description="streamStatus || '正在连接服务，请稍候。'" />
          <StreamPreview v-if="loading" class="mt-4" :status="streamStatus" :content="streamPreview" :max-height="140" />
        </div>

        <section v-if="interviewStore.finished" class="section-card my-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="m-0 text-base font-black text-[#0f172a]">面试已结束</h3>
            <p class="mb-0 mt-1 text-sm font-semibold text-[#64748b]">总结已保存到复盘中心，可以继续查看优势、短板和学习计划。</p>
          </div>
        </section>

        <div class="min-h-0 flex-1 pt-4">
          <ChatBox :messages="interviewStore.messages" :loading="loading" :disabled="interviewStore.finished" @send-answer="sendAnswer" />
        </div>
      </GlassCard>
    </div>
  </div>
</template>




