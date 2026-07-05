<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Clock3, Copy, Mic, PlayCircle, Square } from 'lucide-vue-next'
import ChatBox from '@/components/ChatBox/index.vue'
import GlassCard from '@/components/GlassCard/index.vue'
import InlineStatus from '@/components/InlineStatus/index.vue'
import ResumeUploadDropzone from '@/components/ResumeUploadDropzone/index.vue'
import StreamPreview from '@/components/StreamPreview/index.vue'
import {
  createInterviewStream,
  finishInterviewStream,
  getInterviewSession,
  getInterviewSessions,
  submitInterviewAnswerStream,
} from '@/api/interview'
import { MAX_RESUME_LENGTH, useResumeJdAssets } from '@/composables/useResumeJdAssets'
import { notifyStreamResult, useStreamTask } from '@/composables/useStreamTask'
import { useInterviewStore } from '@/stores/interview'
import { useWorkflowStore } from '@/stores/workflow'
import type { InterviewSessionSummary } from '@/types/interview'
import { formatDateTime } from '@/utils/format'
import { notify } from '@/utils/notify'
import { buildInterviewStudyPlanCopy } from '@/utils/resultCopy'

const interviewStore = useInterviewStore()
const workflowStore = useWorkflowStore()
const route = useRoute()
const {
  loading,
  streamPreview,
  streamStatus,
  errorMessage,
  run,
  cancel: cancelStream,
  appendDelta,
} = useStreamTask()
const workflowMessage = ref('')
const finalSummary = ref<unknown>(null)
const chatBoxRef = ref<InstanceType<typeof ChatBox> | null>(null)
const resumableSession = ref<InterviewSessionSummary | null>(null)
const resumeSessionLoading = ref(false)

const form = reactive({
  resumeContent: '',
  jobDescription: '',
  targetRole: '前端开发工程师',
  interviewType: '项目面试',
  difficulty: '中等',
})

const {
  resumeOptions,
  jobOptions,
  selectedResumeId,
  selectedJobDescriptionId,
  assetsLoading,
  assetsError,
  uploadLoading,
  uploadError,
  selectedFileName,
  loadAssets,
  applyResume,
  applyJobDescription,
  onResumeFileChange,
} = useResumeJdAssets({
  form,
  onResumeApplied: (resume) => {
    form.targetRole = resume.targetRole || form.targetRole
  },
  onJobDescriptionApplied: (job) => {
    form.targetRole = job.jobTitle || form.targetRole
  },
  // 提示语须与 start() 的校验一致：开始面试必须有简历内容，JD 是可选项。
  // JD 分支按简历是否已就位区分文案（resumeId 与 jdId 同时带入时，简历分支先执行）。
  onQueryApplied: (kind) => {
    if (kind === 'resume') {
      workflowMessage.value = '已带入简历管理中的简历，可按需补充岗位 JD 后开始面试。'
    } else {
      workflowMessage.value = form.resumeContent.trim()
        ? '已带入简历和岗位 JD，可直接开始模拟面试。'
        : '已带入 JD 管理中的岗位描述，请补充简历内容后开始面试。'
    }
  },
  queryMissingActionText: '继续面试',
  uploadConfirmMessage: '上传新文件会覆盖当前用于面试的简历或项目经历内容。',
  onUploadStart: () => {
    errorMessage.value = ''
  },
})

const interviewStatus = computed(() => {
  if (interviewStore.finished) return '面试已结束'
  if (loading.value) return 'AI 思考中'
  if (interviewStore.sessionId) return '面试进行中'
  return '等待开始'
})

onMounted(async () => {
  await loadAssets()
  applyWorkflowContext()
  await restoreFromQueryOrDetect()
})

// 刷新或从复盘中心跳回后恢复面试：优先按 ?sessionId= 直接恢复，
// 否则检测最近一个未完成会话并提示用户继续（不强制恢复，用户可能就想开新面试）。
async function restoreFromQueryOrDetect() {
  const querySessionId = route.query.sessionId
  if (typeof querySessionId === 'string' && querySessionId) {
    await resumeSession(querySessionId)
    return
  }

  if (interviewStore.sessionId) return

  try {
    const sessions = await getInterviewSessions()
    resumableSession.value = sessions.find((session) => session.status === 'ongoing') || null
  } catch {
    // 检测失败不打扰用户，直接当作没有可恢复会话。
  }
}

async function resumeSession(id: string) {
  resumeSessionLoading.value = true
  try {
    const detail = await getInterviewSession(id)
    interviewStore.restoreSession(detail)
    form.targetRole = detail.targetRole || form.targetRole
    form.interviewType = detail.interviewType || form.interviewType
    form.difficulty = detail.difficulty || form.difficulty
    if (detail.summary) {
      finalSummary.value = detail.summary
    }
    resumableSession.value = null
    notify(detail.status === 'ongoing' ? '已恢复上次面试，可继续作答' : '已载入面试记录', 'success')
  } catch {
    // toast 已由拦截器弹出，这里补充「接下来怎么办」的页面内引导。
    errorMessage.value = '面试会话恢复失败，可重新开始一场面试。'
  } finally {
    resumeSessionLoading.value = false
  }
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
  } else if (
    context.projectContext &&
    form.resumeContent.trim() &&
    !form.resumeContent.includes(context.projectContext.slice(0, 80))
  ) {
    form.resumeContent = `${form.resumeContent}\n\n${context.projectContext}`.slice(
      0,
      MAX_RESUME_LENGTH,
    )
    applied = true
  }
  if (context.jobDescription && !form.jobDescription.trim()) {
    form.jobDescription = context.jobDescription
    applied = true
  }

  if (applied) {
    selectedResumeId.value = ''
    selectedJobDescriptionId.value = ''
    // 与 start() 校验一致：只有简历内容就位才能开始，避免「可直接开始」误导。
    workflowMessage.value = form.resumeContent.trim()
      ? `已带入${context.sourceLabel || '上一步'}资料，可直接开始模拟面试。`
      : `已带入${context.sourceLabel || '上一步'}资料，请补充简历内容后开始面试。`
  }
}

async function start() {
  if (loading.value || uploadLoading.value) return

  if (!form.resumeContent.trim() || !form.targetRole.trim()) {
    errorMessage.value = '请填写简历内容和目标岗位后再开始面试。'
    notify('请填写简历内容和目标岗位', 'warning')
    return
  }

  await runInterviewStream('AI 正在生成第一道面试题', async (signal) => {
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
    notifyStreamResult(response.meta, response.cached, {
      success: '模拟面试已开始',
      cached: '命中缓存，模拟面试已开始',
    })
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

  const userMessageId = crypto.randomUUID()
  interviewStore.appendMessage({ id: userMessageId, role: 'user', content: answer })

  const succeeded = await runInterviewStream('AI 正在点评回答并生成追问', async (signal) => {
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
    // 追问属于持续对话，成功不弹提示，只提醒 parse_error。
    notifyStreamResult(response.meta, response.cached)
  })

  if (!succeeded) {
    // 回答已从消息列表移除，把内容回填输入框，避免长文本回答丢失。
    interviewStore.removeMessage(userMessageId)
    chatBoxRef.value?.restoreDraft(answer)
  }
}

async function finish() {
  // finished 判断防止已结束的会话重复触发 finish 流式请求（左右两处按钮之外的调用路径同样受保护）。
  if (!interviewStore.sessionId || loading.value || interviewStore.finished) return

  await runInterviewStream('AI 正在生成面试总结', async (signal) => {
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
    notifyStreamResult(response.meta, response.cached, {
      success: '模拟面试已结束',
      cached: '命中缓存，模拟面试已结束',
    })
  })
}

// 开始/追问/总结三种操作共用同一套取消与失败文案，仅初始状态文案不同。
function runInterviewStream(initialStatus: string, runner: (signal: AbortSignal) => Promise<void>) {
  return run({
    initialStatus,
    abortText: '已取消本次生成',
    failText: 'AI 生成失败，请稍后重试。',
    runner,
  })
}

const studyPlanText = computed(() =>
  finalSummary.value ? buildInterviewStudyPlanCopy(finalSummary.value) : '',
)

async function copyStudyPlan() {
  if (!studyPlanText.value) return
  try {
    await navigator.clipboard.writeText(studyPlanText.value)
    notify('已复制学习计划', 'success')
  } catch {
    // 复制是瞬时动作，toast 是正确的反馈面；不写 errorMessage 以免误触发「面试暂时无法继续」横幅。
    notify('复制失败，请检查浏览器剪贴板权限后重试', 'error')
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
        <p class="mt-1.5 text-sm font-semibold text-[#64748b]">
          根据简历和目标岗位生成问题、点评回答，并持续追问。
        </p>
      </div>
      <RouterLink class="btn-secondary ml-auto" to="/history">
        <Clock3 :size="18" />
        查看面试记录
      </RouterLink>
    </header>

    <InlineStatus
      v-if="assetsError"
      type="warning"
      title="资料加载失败"
      :description="assetsError"
    />

    <section
      v-if="resumableSession && !interviewStore.sessionId"
      class="glass-card flex flex-wrap items-center justify-between gap-3 p-4"
    >
      <div>
        <h3 class="m-0 text-base font-black text-[#0f172a]">检测到未完成的面试</h3>
        <p class="mb-0 mt-1 text-sm font-semibold text-[#64748b]">
          「{{ resumableSession.title }}」开始于
          {{ formatDateTime(resumableSession.createdAt) }}，可以继续作答。
        </p>
      </div>
      <div class="flex gap-3">
        <button
          class="btn-primary min-h-10"
          :disabled="resumeSessionLoading || loading"
          @click="resumeSession(resumableSession.id)"
        >
          {{ resumeSessionLoading ? '恢复中...' : '继续上次面试' }}
        </button>
        <button
          class="btn-secondary min-h-10"
          :disabled="resumeSessionLoading"
          @click="resumableSession = null"
        >
          忽略
        </button>
      </div>
    </section>

    <div class="feature-workspace-compact">
      <GlassCard class="feature-pane-left">
        <h2 class="section-title">面试配置</h2>
        <InlineStatus
          v-if="assetsLoading"
          class="mb-4"
          type="loading"
          title="正在加载已有资料"
          description="稍等一下，简历和 JD 记录马上回来。"
        />
        <InlineStatus
          v-if="workflowMessage"
          class="mb-4"
          type="success"
          title="资料已带入"
          :description="workflowMessage"
        />
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
              <select
                v-model="selectedResumeId"
                class="select-base"
                :disabled="loading || uploadLoading"
                @change="applyResume(selectedResumeId)"
              >
                <option value="">手动输入 / 上传新简历</option>
                <option v-for="resume in resumeOptions" :key="resume.id" :value="resume.id">
                  {{ resume.title }}
                </option>
              </select>
            </label>
            <ResumeUploadDropzone
              :uploading="uploadLoading"
              :disabled="loading"
              :selected-file-name="selectedFileName"
              @change="onResumeFileChange"
            />
            <InlineStatus
              v-if="uploadError"
              class="mb-3"
              type="error"
              title="上传失败"
              :description="uploadError"
            />
            <textarea
              v-model="form.resumeContent"
              class="textarea-base min-h-[120px]"
              :maxlength="MAX_RESUME_LENGTH"
              placeholder="粘贴或上传用于面试的简历、项目经历..."
              :disabled="loading || uploadLoading"
              @input="selectedResumeId = ''"
            />
            <span class="mt-1 block text-right text-xs text-[#64748b]"
              >{{ form.resumeContent.length }} / {{ MAX_RESUME_LENGTH }}</span
            >
          </div>
          <label>
            <span class="field-label">岗位 JD（可选）</span>
            <select
              v-if="jobOptions.length"
              v-model="selectedJobDescriptionId"
              class="select-base mb-3"
              :disabled="loading"
              @change="applyJobDescription(selectedJobDescriptionId)"
            >
              <option value="">手动输入新 JD</option>
              <option v-for="job in jobOptions" :key="job.id" :value="job.id">
                {{ job.companyName ? `${job.companyName} - ${job.jobTitle}` : job.jobTitle }}
              </option>
            </select>
            <textarea
              v-model="form.jobDescription"
              class="textarea-base min-h-[60px]"
              placeholder="粘贴 JD 后，问题会更贴近岗位要求。"
              :disabled="loading"
              @input="selectedJobDescriptionId = ''"
            />
          </label>
          <InlineStatus
            v-if="errorMessage"
            type="error"
            title="面试暂时无法继续"
            :description="errorMessage"
          />
          <button
            class="btn-primary mt-2 w-full"
            :disabled="loading || uploadLoading"
            @click="start"
          >
            <PlayCircle :size="18" />
            {{ loading ? '生成中...' : '开始面试' }}
          </button>
          <button
            class="btn-secondary w-full"
            :disabled="!interviewStore.sessionId || loading || interviewStore.finished"
            @click="finish"
          >
            结束面试
          </button>
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
              <button
                v-else-if="interviewStore.sessionId && !interviewStore.finished"
                class="btn-secondary min-h-10"
                @click="finish"
              >
                结束面试
              </button>
              <button
                v-if="interviewStore.finished"
                class="btn-secondary min-h-10"
                :disabled="!studyPlanText"
                @click="copyStudyPlan"
              >
                <Copy :size="18" />
                复制学习计划
              </button>
              <RouterLink
                v-if="interviewStore.finished"
                class="btn-secondary min-h-10"
                to="/history"
              >
                <Clock3 :size="18" />
                查看复盘记录
              </RouterLink>
            </div>
          </div>

          <InlineStatus
            v-if="loading"
            class="mt-4"
            type="loading"
            title="AI 正在生成"
            :description="streamStatus || '正在连接服务，请稍候。'"
          />
          <StreamPreview
            v-if="loading"
            class="mt-4"
            :status="streamStatus"
            :content="streamPreview"
            :max-height="140"
          />
        </div>

        <section
          v-if="interviewStore.finished"
          class="section-card my-4 flex shrink-0 flex-wrap items-center justify-between gap-3"
        >
          <div>
            <h3 class="m-0 text-base font-black text-[#0f172a]">面试已结束</h3>
            <p class="mb-0 mt-1 text-sm font-semibold text-[#64748b]">
              总结已保存到复盘中心，可以继续查看优势、短板和学习计划。
            </p>
          </div>
        </section>

        <div class="min-h-0 flex-1 pt-4">
          <ChatBox
            ref="chatBoxRef"
            :messages="interviewStore.messages"
            :loading="loading"
            :disabled="interviewStore.finished"
            @send-answer="sendAnswer"
          />
        </div>
      </GlassCard>
    </div>
  </div>
</template>
