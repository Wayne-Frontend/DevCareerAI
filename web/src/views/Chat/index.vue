<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MessagesSquare, Plus, Square, Trash2 } from 'lucide-vue-next'
import ChatBox from '@/components/ChatBox/index.vue'
import GlassCard from '@/components/GlassCard/index.vue'
import InlineStatus from '@/components/InlineStatus/index.vue'
import {
  createChatSession,
  deleteChatSession,
  getChatSession,
  getChatSessions,
  sendChatMessageStream,
  updateChatSession,
} from '@/api/chat'
import { getJobDescriptions } from '@/api/job'
import { getResumes } from '@/api/resume'
import { useChatStore } from '@/stores/chat'
import type { JobDescriptionRecord } from '@/types/job'
import type { ResumeRecord } from '@/types/resume'
import { formatDateTime } from '@/utils/format'
import { messageBox } from '@/utils/messageBox'
import { notify } from '@/utils/notify'

const MAX_MESSAGE_LENGTH = 4000

const chatStore = useChatStore()
const loading = ref(false)
const sessionLoading = ref(false)
const assetsError = ref('')
const errorMessage = ref('')
const controller = ref<AbortController | null>(null)
const resumeOptions = ref<ResumeRecord[]>([])
const jobOptions = ref<JobDescriptionRecord[]>([])
const selectedResumeId = ref('')
const selectedJobDescriptionId = ref('')

const chatStatus = computed(() => {
  if (loading.value) return 'AI 思考中'
  if (chatStore.activeSessionId) return '会话进行中'
  return '新的会话'
})

const contextSummary = computed(() => {
  const parts: string[] = []
  if (selectedResumeId.value) {
    const resume = resumeOptions.value.find((item) => item.id === selectedResumeId.value)
    if (resume) parts.push(`简历：${resume.title}`)
  }
  if (selectedJobDescriptionId.value) {
    const job = jobOptions.value.find((item) => item.id === selectedJobDescriptionId.value)
    if (job) parts.push(`JD：${job.jobTitle}`)
  }
  return parts.length ? parts.join('，') : '未勾选上下文，AI 将仅根据对话内容回答。'
})

onBeforeUnmount(() => {
  controller.value?.abort()
})

onMounted(async () => {
  await Promise.all([loadAssets(), loadSessions()])

  // 默认打开最近的会话；没有历史会话则停留在草稿态。
  const latest = chatStore.sessions[0]
  if (latest && !chatStore.activeSessionId) {
    await openSession(latest.id)
  } else if (chatStore.activeSessionId) {
    // 从其他页面返回时恢复当前会话的上下文勾选。
    syncContextFromSession(chatStore.sessions.find((item) => item.id === chatStore.activeSessionId))
  }
})

async function loadAssets() {
  assetsError.value = ''
  try {
    const [resumes, jobs] = await Promise.all([getResumes(), getJobDescriptions()])
    resumeOptions.value = resumes
    jobOptions.value = jobs
  } catch {
    assetsError.value = '简历或 JD 列表加载失败，仍可以直接对话。'
  }
}

async function loadSessions() {
  try {
    chatStore.setSessions(await getChatSessions())
  } catch {
    notify('会话列表加载失败', 'warning')
  }
}

function syncContextFromSession(session?: {
  resumeId?: string | null
  jobDescriptionId?: string | null
}) {
  selectedResumeId.value = session?.resumeId || ''
  selectedJobDescriptionId.value = session?.jobDescriptionId || ''
}

async function openSession(sessionId: string) {
  if (loading.value || sessionLoading.value || sessionId === chatStore.activeSessionId) return

  sessionLoading.value = true
  errorMessage.value = ''
  try {
    const detail = await getChatSession(sessionId)
    chatStore.openSession(detail.id, detail.messages)
    syncContextFromSession(detail)
  } catch {
    notify('会话加载失败，请稍后重试', 'error')
  } finally {
    sessionLoading.value = false
  }
}

function startNewSession() {
  if (loading.value) return
  chatStore.startDraft()
  syncContextFromSession(undefined)
  errorMessage.value = ''
}

async function removeSession(sessionId: string) {
  const confirmed = await messageBox.confirm({
    type: 'warning',
    title: '删除这个会话？',
    message: '删除后对话记录无法恢复。',
    confirmText: '删除',
  })
  if (!confirmed) return

  try {
    await deleteChatSession(sessionId)
    chatStore.removeSession(sessionId)
    if (!chatStore.activeSessionId) {
      syncContextFromSession(undefined)
    }
    notify('会话已删除', 'success')
  } catch {
    notify('删除失败，请稍后重试', 'error')
  }
}

// 勾选变化：已有会话立即同步到后端；草稿态则在首条消息创建会话时一并提交。
async function onContextChange() {
  if (!chatStore.activeSessionId) return

  try {
    const session = await updateChatSession(chatStore.activeSessionId, {
      resumeId: selectedResumeId.value || null,
      jobDescriptionId: selectedJobDescriptionId.value || null,
    })
    chatStore.patchSession(session.id, session)
  } catch {
    notify('上下文更新失败，请稍后重试', 'error')
  }
}

async function ensureSession() {
  if (chatStore.activeSessionId) return chatStore.activeSessionId

  const session = await createChatSession({
    resumeId: selectedResumeId.value || undefined,
    jobDescriptionId: selectedJobDescriptionId.value || undefined,
  })
  chatStore.upsertSession(session)
  chatStore.openSession(session.id, [])
  return session.id
}

async function sendMessage(content: string) {
  if (loading.value) return
  errorMessage.value = ''

  let sessionId: string
  try {
    sessionId = await ensureSession()
  } catch {
    errorMessage.value = '会话创建失败，请稍后重试。'
    return
  }

  const userTempId = crypto.randomUUID()
  const aiTempId = crypto.randomUUID()
  chatStore.appendMessage({ id: userTempId, role: 'user', content })
  chatStore.appendMessage({ id: aiTempId, role: 'ai', content: '' })

  controller.value = new AbortController()
  loading.value = true

  try {
    const response = await sendChatMessageStream(sessionId, content, {
      signal: controller.value.signal,
      onDelta: (delta) => chatStore.appendToMessage(aiTempId, delta),
    })

    chatStore.updateMessage(userTempId, { id: response.userMessage.id })
    chatStore.updateMessage(aiTempId, {
      id: response.aiMessage.id,
      content: response.aiMessage.content,
    })

    const session = chatStore.sessions.find((item) => item.id === sessionId)
    chatStore.upsertSession({
      ...(session || {
        id: sessionId,
        createdAt: new Date().toISOString(),
        resumeId: selectedResumeId.value || null,
        jobDescriptionId: selectedJobDescriptionId.value || null,
      }),
      title: response.title,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    chatStore.removeMessage(aiTempId)
    chatStore.removeMessage(userTempId)
    if ((error as Error).name === 'AbortError') {
      notify('已取消本次回复', 'info')
    } else {
      errorMessage.value = 'AI 回复失败，请稍后重试。'
    }
  } finally {
    loading.value = false
    controller.value = null
  }
}

function cancelStream() {
  controller.value?.abort()
}
</script>

<template>
  <div class="page chat-page">
    <header class="flex items-center gap-4">
      <div class="icon-tile">
        <MessagesSquare :size="23" />
      </div>
      <div>
        <h1 class="m-0 text-[26px] font-black text-[#0f172a]">职业顾问</h1>
        <p class="mt-1.5 text-sm font-semibold text-[#64748b]">
          求职路上的任何问题都可以聊：薪资谈判、offer 选择、职业规划、离职沟通……
        </p>
      </div>
    </header>

    <InlineStatus
      v-if="assetsError"
      class="shrink-0"
      type="warning"
      title="资料加载失败"
      :description="assetsError"
    />

    <div class="feature-workspace-compact chat-workspace">
      <GlassCard class="feature-pane-left chat-pane flex flex-col">
        <div class="flex shrink-0 items-center justify-between gap-2">
          <h2 class="section-title m-0">会话</h2>
          <button class="btn-secondary min-h-10" :disabled="loading" @click="startNewSession">
            <Plus :size="16" />
            新会话
          </button>
        </div>

        <div class="mt-4 grid shrink-0 gap-3">
          <label>
            <span class="field-label">携带简历（可选）</span>
            <select
              v-model="selectedResumeId"
              class="select-base"
              :disabled="loading"
              @change="onContextChange"
            >
              <option value="">不携带简历</option>
              <option v-for="resume in resumeOptions" :key="resume.id" :value="resume.id">
                {{ resume.title }}
              </option>
            </select>
          </label>
          <label>
            <span class="field-label">携带岗位 JD（可选）</span>
            <select
              v-model="selectedJobDescriptionId"
              class="select-base"
              :disabled="loading"
              @change="onContextChange"
            >
              <option value="">不携带 JD</option>
              <option v-for="job in jobOptions" :key="job.id" :value="job.id">
                {{ job.companyName ? `${job.companyName} - ${job.jobTitle}` : job.jobTitle }}
              </option>
            </select>
          </label>
          <p class="m-0 truncate text-xs font-semibold text-[#64748b]" :title="contextSummary">
            {{ contextSummary }}
          </p>
        </div>

        <div
          class="chat-session-list soft-scrollbar mt-4 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overflow-x-hidden pr-1"
        >
          <p
            v-if="chatStore.sessions.length === 0"
            class="m-0 py-4 text-center text-xs font-semibold text-[#94a3b8]"
          >
            还没有历史会话，发出第一条消息即可创建。
          </p>
          <div
            v-for="session in chatStore.sessions"
            :key="session.id"
            class="group flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-[13px] border border-white/70 bg-white/55 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_16px_rgba(31,73,125,0.05)] transition hover:-translate-y-px hover:bg-white/80"
            :class="{ 'chat-session-active': session.id === chatStore.activeSessionId }"
            @click="openSession(session.id)"
          >
            <div class="min-w-0 flex-1">
              <p class="m-0 truncate text-sm font-extrabold text-[#0f172a]" :title="session.title">
                {{ session.title }}
              </p>
              <p class="m-0 mt-0.5 truncate text-xs font-semibold text-[#94a3b8]">
                {{ formatDateTime(session.updatedAt) }}
              </p>
            </div>
            <button
              class="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-[#94a3b8] opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
              aria-label="删除会话"
              @click.stop="removeSession(session.id)"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </div>
      </GlassCard>

      <GlassCard class="feature-pane-right chat-pane flex flex-col">
        <div
          class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[rgba(148,163,184,0.22)] pb-4"
        >
          <div class="flex min-w-0 items-center gap-3">
            <h2 class="m-0 flex items-center gap-2 text-lg font-black text-[#0f172a]">
              <MessagesSquare :size="18" class="text-indigo-500" />
              AI 职业顾问
            </h2>
            <p class="m-0 hidden truncate text-xs text-[#64748b] md:block">
              勾选简历或 JD 后，建议会更贴合你的实际情况。
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <span class="soft-tag">{{ chatStatus }}</span>
            <button v-if="loading" class="btn-secondary min-h-9" @click="cancelStream">
              <Square :size="14" />
              取消生成
            </button>
          </div>
        </div>

        <InlineStatus
          v-if="sessionLoading"
          class="mt-4 shrink-0"
          type="loading"
          title="正在加载会话"
          description="马上就好。"
        />
        <InlineStatus
          v-if="errorMessage"
          class="mt-4 shrink-0"
          type="error"
          title="出了点问题"
          :description="errorMessage"
        />

        <div class="min-h-0 flex-1 pt-4">
          <ChatBox
            :messages="chatStore.messages"
            :loading="loading"
            :max-length="MAX_MESSAGE_LENGTH"
            markdown
            empty-title="开始对话"
            empty-description="例如：「帮我评估这份 offer 的薪资是否合理」「入职新公司前两周应该做什么」"
            placeholder="想聊点什么？求职、职业规划相关的问题都可以..."
            disabled-hint=""
            @send-answer="sendMessage"
          />
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped>
/* 聊天页采用固定视口高度：页面本身不滚动，滚动只发生在会话列表和消息区内部。 */
.chat-page {
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
}

.chat-workspace {
  flex: 1 1 0%;
  min-height: 0;
}

/* 覆盖全局 feature-pane 的整体滚动：改为卡片内部各区域自行滚动。 */
.chat-page .chat-pane {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding-right: 22px;
}

.chat-session-active {
  border-color: rgba(99, 102, 241, 0.38);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(255, 255, 255, 0.85));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 10px 24px rgba(99, 102, 241, 0.12);
}

/* 窄屏（全局样式在 1180px 处折叠为单列）：退回普通页面滚动，
   会话列表限高、消息区固定高度，保证聊天仍然可用。 */
@media (max-width: 1180px) {
  .chat-page {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }

  .chat-page .chat-pane {
    height: auto;
    overflow: visible;
  }

  .chat-page .chat-session-list {
    max-height: 38dvh;
  }

  .chat-page .feature-pane-right.chat-pane {
    height: 80dvh;
    overflow: hidden;
  }
}
</style>
