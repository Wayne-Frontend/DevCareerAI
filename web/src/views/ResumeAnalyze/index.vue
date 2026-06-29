<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircle2, Copy, FileSearch, Mic, Search, Square, Target, UploadCloud } from 'lucide-vue-next'
import BeforeAfterCompare from '../../components/BeforeAfterCompare/index.vue'
import EmptyState from '../../components/EmptyState/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import InlineStatus from '../../components/InlineStatus/index.vue'
import LoadingButton from '../../components/LoadingButton/index.vue'
import ScoreCard from '../../components/ScoreCard/index.vue'
import StreamPreview from '../../components/StreamPreview/index.vue'
import SuggestionList from '../../components/SuggestionList/index.vue'
import { analyzeResumeStream, createResume, getResume, getResumes, uploadResume } from '../../api/resume'
import { useResumeStore } from '../../stores/resume'
import { useWorkflowStore } from '../../stores/workflow'
import type { ResumeAnalysisResult, ResumePayload, ResumeRecord } from '../../types/resume'
import { messageBox } from '../../utils/messageBox'
import { notify } from '../../utils/notify'
import { buildResumeSuggestionCopy } from '../../utils/resultCopy'

const resumeStore = useResumeStore()
const workflowStore = useWorkflowStore()
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const uploadLoading = ref(false)
const resumesLoading = ref(false)
const selectedFileName = ref('')
const result = ref<ResumeAnalysisResult | null>(null)
const resultStatus = ref<'success' | 'parse_error'>('success')
const streamPreview = ref('')
const streamStatus = ref('')
const errorMessage = ref('')
const uploadError = ref('')
const resumesError = ref('')
const controller = ref<AbortController | null>(null)
const selectedResumeId = ref('')
const selectedResumeSnapshot = ref<ResumePayload | null>(null)
const resumeOptions = ref<ResumeRecord[]>([])

const suggestionText = computed(() => (result.value ? buildResumeSuggestionCopy(result.value) : ''))

const form = reactive({
  title: '',
  targetRole: '前端开发工程师',
  experienceLevel: '3-5',
  content: '',
})

const jobMatchTarget = computed(() => ({
  path: '/job-match',
  query: selectedResumeId.value ? { resumeId: selectedResumeId.value } : undefined,
}))

onMounted(() => {
  void loadResumeOptions()
})

onBeforeUnmount(() => {
  controller.value?.abort()
})

function readResumeIdQuery() {
  const value = route.query.resumeId
  return typeof value === 'string' ? value : ''
}

function snapshotForm(): ResumePayload {
  return {
    title: form.title,
    targetRole: form.targetRole,
    experienceLevel: form.experienceLevel,
    content: form.content,
  }
}

function isUsingSelectedResume() {
  const snapshot = selectedResumeSnapshot.value
  if (!selectedResumeId.value || !snapshot) return false

  return (
    form.title === snapshot.title &&
    form.targetRole === (snapshot.targetRole || '') &&
    form.experienceLevel === (snapshot.experienceLevel || '') &&
    form.content === snapshot.content
  )
}

async function applyResumeFromQuery() {
  const resumeId = readResumeIdQuery()
  if (!resumeId) return

  try {
    await applyResume(resumeId, true)
    notify('已带入简历管理中的简历，可直接开始诊断', 'success')
  } catch {
    notify('简历加载失败，可手动填写后继续诊断', 'warning')
  }
}

async function loadResumeOptions() {
  resumesLoading.value = true
  resumesError.value = ''
  try {
    resumeOptions.value = await getResumes()
    await applyResumeFromQuery()
  } catch {
    resumesError.value = '已有简历加载失败，不影响手动上传或粘贴简历。'
  } finally {
    resumesLoading.value = false
  }
}

async function applyResume(id: string, allowFetch = false) {
  if (!id) {
    selectedResumeId.value = ''
    selectedResumeSnapshot.value = null
    return
  }

  const resume = resumeOptions.value.find((item) => item.id === id) || (allowFetch ? await getResume(id) : null)
  if (!resume) {
    throw new Error('Resume not found')
  }

  selectedResumeId.value = resume.id
  form.title = resume.title
  form.targetRole = resume.targetRole || ''
  form.experienceLevel = resume.experienceLevel || ''
  form.content = resume.content
  selectedResumeSnapshot.value = snapshotForm()
  selectedFileName.value = ''
  uploadError.value = ''
}

async function onResumeSelect() {
  if (!selectedResumeId.value) {
    selectedResumeSnapshot.value = null
    return
  }

  try {
    await applyResume(selectedResumeId.value)
    notify('已切换为已有简历', 'success')
  } catch {
    selectedResumeId.value = ''
    selectedResumeSnapshot.value = null
    notify('简历加载失败，请重新选择', 'warning')
  }
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (form.content.trim()) {
    const confirmed = await messageBox.confirm({
      type: 'warning',
      title: '替换当前简历内容？',
      message: '上传新文件会覆盖当前输入区内容，已有编辑不会自动保存。',
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
    selectedResumeSnapshot.value = null
    selectedFileName.value = parsed.fileName
    form.title ||= parsed.fileName.replace(/\.[^.]+$/, '')
    form.content = parsed.content
    notify(parsed.truncated ? '文件已解析，内容较长，已自动截断' : '文件已解析', 'success')
  } catch {
    input.value = ''
    uploadError.value = '文件解析失败，请确认格式为 PDF、DOCX、TXT 或 MD 后重试。'
  } finally {
    uploadLoading.value = false
    input.value = ''
  }
}

async function submit() {
  if (loading.value || uploadLoading.value) return

  if (!form.title.trim() || !form.content.trim()) {
    errorMessage.value = '请填写简历标题和简历内容后再开始分析。'
    notify('请填写简历标题和简历内容', 'warning')
    return
  }

  controller.value = new AbortController()
  loading.value = true
  streamPreview.value = ''
  streamStatus.value = 'AI 正在建立连接'
  errorMessage.value = ''

  try {
    const resume = isUsingSelectedResume() ? await getResume(selectedResumeId.value) : await createResume({ ...form })
    selectedResumeId.value = resume.id
    selectedResumeSnapshot.value = {
      title: resume.title,
      targetRole: resume.targetRole || '',
      experienceLevel: resume.experienceLevel || '',
      content: resume.content,
    }
    resumeStore.setCurrentResume(resume)
    const analysis = await analyzeResumeStream(resume.id, {
      signal: controller.value.signal,
      onStart: () => {
        streamStatus.value = 'AI 正在分析简历结构'
      },
      onDelta: (delta) => {
        streamStatus.value = 'AI 正在生成结构化诊断'
        streamPreview.value += delta
      },
    })
    result.value = analysis.result
    resultStatus.value = analysis.meta?.status || 'success'
    notify(
      resultStatus.value === 'parse_error'
        ? 'AI 结果格式异常，已保留原文整理结果'
        : analysis.cached
          ? '命中缓存，简历诊断结果已生成'
          : '简历诊断结果已生成',
      resultStatus.value === 'parse_error' ? 'warning' : 'success',
    )
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      notify('已取消本次分析', 'info')
    } else {
      errorMessage.value = '简历诊断生成失败，请稍后重试。'
    }
  } finally {
    loading.value = false
    controller.value = null
    streamStatus.value = ''
  }
}

function cancelStream() {
  controller.value?.abort()
}

async function copySuggestions() {
  if (!suggestionText.value) return
  try {
    await navigator.clipboard.writeText(suggestionText.value)
    notify('已复制优化建议', 'success')
  } catch {
    errorMessage.value = '复制失败，请检查浏览器剪贴板权限后重试。'
    notify('复制失败', 'error')
  }
}

function goInterviewFromResume() {
  workflowStore.setInterviewContext({
    targetRole: form.targetRole,
    resumeContent: form.content,
    sourceLabel: '简历诊断',
  })
  void router.push('/interview')
}
</script>

<template>
  <div class="page">
    <header class="flex items-center gap-4">
      <div class="icon-tile">
        <FileSearch :size="23" />
      </div>
      <div>
        <h1 class="m-0 text-[26px] font-black text-[#0f172a]">简历诊断</h1>
        <p class="mt-1.5 text-sm font-semibold text-[#64748b]">上传或粘贴简历，获得 AI 评分、问题定位和优化建议。</p>
      </div>
    </header>

    <div class="feature-workspace">
      <GlassCard class="feature-pane-left">
        <div class="mb-5 flex items-center gap-3">
          <span class="grid h-7 w-7 place-items-center rounded-full bg-indigo-50 text-xs font-black text-indigo-600">1</span>
          <h2 class="m-0 text-lg font-black text-[#0f172a]">简历输入</h2>
        </div>

        <InlineStatus v-if="resumesLoading" class="mb-4" type="loading" title="正在加载已有简历" description="稍等一下，简历列表马上回来。" />
        <InlineStatus v-else-if="resumesError" class="mb-4" type="warning" title="已有简历加载失败" :description="resumesError" />

        <label v-if="resumeOptions.length" class="mb-4 block">
          <span class="field-label">选择已有简历</span>
          <select v-model="selectedResumeId" class="select-base" :disabled="loading || uploadLoading" @change="onResumeSelect">
            <option value="">手动输入 / 上传新简历</option>
            <option v-for="resume in resumeOptions" :key="resume.id" :value="resume.id">{{ resume.title }}</option>
          </select>
        </label>

        <label class="field-label">上传简历</label>
        <label class="mb-4 grid min-h-[110px] cursor-pointer place-items-center rounded-[14px] border border-dashed border-indigo-200 bg-white/45 p-4 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40" :class="{ 'is-uploading': uploadLoading }">
          <input class="hidden" type="file" accept=".pdf,.docx,.txt,.md" :disabled="uploadLoading" @change="onFileChange" />
          <UploadCloud :size="40" class="text-indigo-500" />
          <span class="mt-3 block text-sm font-extrabold text-[#26324f]">{{ uploadLoading ? '解析中...' : '点击上传 PDF / DOCX / TXT / MD' }}</span>
          <InlineStatus v-if="uploadLoading" class="mt-3" type="loading" title="正在解析文件" description="完成后会自动填入简历正文。" />
          <InlineStatus v-if="uploadError" class="mt-3" type="error" title="上传失败" :description="uploadError" />
          <span v-if="selectedFileName" class="mt-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">{{ selectedFileName }}</span>
        </label>

        <div class="grid gap-3">
          <label>
            <span class="field-label">简历标题</span>
            <input v-model="form.title" class="input-base" placeholder="例如：前端开发工程师简历" />
          </label>
          <label>
            <span class="field-label">目标岗位</span>
            <input v-model="form.targetRole" class="input-base" placeholder="例如：前端开发工程师" />
          </label>
          <label>
            <span class="field-label">经验年限</span>
            <select v-model="form.experienceLevel" class="select-base">
              <option value="">未指定</option>
              <option value="junior">应届 / 1 年以内</option>
              <option value="1-3">1-3 年</option>
              <option value="3-5">3-5 年</option>
              <option value="5+">5 年以上</option>
            </select>
          </label>
          <label>
            <span class="field-label">简历内容</span>
            <textarea v-model="form.content" class="textarea-base min-h-[150px]" maxlength="30000" placeholder="将你的简历内容粘贴到这里..." :disabled="loading || uploadLoading" />
            <span class="mt-1 block text-right text-xs text-[#64748b]">{{ form.content.length }} / 30000</span>
          </label>
        </div>

        <InlineStatus v-if="errorMessage" class="mt-4" type="error" title="暂时无法开始分析" :description="errorMessage" />

        <div class="mt-5 grid gap-3">
          <LoadingButton class="w-full" :loading="loading" :disabled="uploadLoading" loading-text="分析中..." @click="submit">
            <template #icon><Search :size="18" /></template>
            {{ loading ? '分析中...' : '开始分析' }}
          </LoadingButton>
          <button v-if="loading" class="btn-secondary w-full" @click="cancelStream">
            <Square :size="16" />
            取消本次生成
          </button>
        </div>
      </GlassCard>

      <GlassCard class="feature-pane-right soft-scrollbar">
        <div class="mb-5 flex items-center gap-3">
          <span class="grid h-7 w-7 place-items-center rounded-full bg-indigo-50 text-xs font-black text-indigo-600">2</span>
          <h2 class="m-0 text-lg font-black text-[#0f172a]">诊断结果</h2>
        </div>

        <InlineStatus v-if="loading" class="mb-4" type="loading" title="AI 正在生成诊断" :description="streamStatus || '正在连接服务，请稍候。'" />
        <StreamPreview v-if="loading" :status="streamStatus" :content="streamPreview" />

        <EmptyState
          v-if="!result && !loading"
          title="等待 AI 诊断"
          description="提交简历后，这里会展示评分、优势、问题、建议和优化示例。"
        />
        <div v-else-if="result" class="grid gap-4">
          <section class="section-card">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="m-0 text-base font-black text-[#0f172a]">下一步建议</h3>
                <p class="mb-0 mt-1 text-sm font-semibold text-[#64748b]">先吸收优化建议，再做岗位匹配或进入模拟面试检验表达。</p>
              </div>
              <div class="flex flex-wrap gap-3">
                <button class="btn-secondary min-h-10" @click="copySuggestions">
                  <Copy :size="18" />
                  复制优化建议
                </button>
                <RouterLink class="btn-secondary min-h-10" :to="jobMatchTarget">
                  <Target :size="18" />
                  继续岗位匹配
                </RouterLink>
                <button class="btn-secondary min-h-10" @click="goInterviewFromResume">
                  <Mic :size="18" />
                  去模拟面试
                </button>
              </div>
            </div>
          </section>
          <p v-if="resultStatus === 'parse_error'" class="m-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-700">
            AI 返回内容不是合法 JSON，已保留原文整理结果，建议重试生成。
          </p>

          <section class="section-card">
            <ScoreCard :score="result.score" title="简历综合评分" :summary="result.summary" />
          </section>

          <section class="section-card">
            <h3 class="mb-4 mt-0 text-lg font-black text-[#0f172a]">维度评分</h3>
            <div class="grid grid-cols-5 gap-3">
              <div v-for="(score, key) in result.dimensionScores" :key="key" class="rounded-2xl border border-slate-200 bg-white/70 p-3 text-center">
                <strong class="block text-2xl text-indigo-600">{{ score }}</strong>
                <span class="text-xs font-bold text-[#64748b]">{{ key }}</span>
              </div>
            </div>
          </section>

          <div class="grid grid-cols-2 gap-4">
            <SuggestionList title="优势" :items="result.strengths" />
            <SuggestionList title="存在问题" :items="result.weaknesses" />
          </div>

          <section class="section-card">
            <h3 class="mb-4 mt-0 flex items-center gap-2 text-lg font-black text-[#0f172a]">
              <CheckCircle2 :size="19" class="text-indigo-500" />
              优化建议
            </h3>
            <ul class="m-0 grid list-none gap-3 p-0">
              <li v-for="(item, index) in result.suggestions" :key="item" class="grid grid-cols-[34px_1fr] gap-3 rounded-2xl border border-slate-200 bg-white/60 p-3 text-sm leading-7 text-[#334155]">
                <span class="icon-tile h-8 w-8 rounded-xl">{{ index + 1 }}</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </section>

          <SuggestionList title="项目经历优化方向" :items="result.projectSuggestions" />

          <section class="section-card">
            <h3 class="mb-4 mt-0 text-lg font-black text-[#0f172a]">优化示例</h3>
            <BeforeAfterCompare :list="result.optimizedExamples" />
          </section>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped>
.is-uploading {
  background: rgba(239, 246, 255, 0.72);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08), 0 14px 30px rgba(37, 99, 235, 0.08);
}
</style>




