<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BriefcaseBusiness, ClipboardList, Copy, FileText, Info, Mic, Square, Target, UploadCloud, WandSparkles } from 'lucide-vue-next'
import EmptyState from '../../components/EmptyState/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import InlineStatus from '../../components/InlineStatus/index.vue'
import KeywordTags from '../../components/KeywordTags/index.vue'
import SuggestionList from '../../components/SuggestionList/index.vue'
import ScoreCard from '../../components/ScoreCard/index.vue'
import StreamPreview from '../../components/StreamPreview/index.vue'
import { getJobDescriptions, matchJobStream } from '../../api/job'
import { getResumes, uploadResume } from '../../api/resume'
import type { JobDescriptionRecord, JobMatchResult } from '../../types/job'
import type { ResumeRecord } from '../../types/resume'
import { useWorkflowStore } from '../../stores/workflow'
import { messageBox } from '../../utils/messageBox'
import { notify } from '../../utils/notify'
import { buildJobMatchCopy } from '../../utils/resultCopy'

const MAX_RESUME_LENGTH = 20000
const workflowStore = useWorkflowStore()
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const uploadLoading = ref(false)
const assetsLoading = ref(false)
const selectedFileName = ref('')
const result = ref<JobMatchResult | null>(null)
const resultStatus = ref<'success' | 'parse_error'>('success')
const streamPreview = ref('')
const streamStatus = ref('')
const errorMessage = ref('')
const uploadError = ref('')
const assetsError = ref('')
const controller = ref<AbortController | null>(null)
const resumeOptions = ref<ResumeRecord[]>([])
const jobOptions = ref<JobDescriptionRecord[]>([])
const selectedResumeId = ref('')
const selectedJobDescriptionId = ref('')
const queryApplied = ref(false)

const form = reactive({
  resumeContent: '',
  jobTitle: '前端开发工程师',
  companyName: '',
  jobDescription: '',
})

const dimensionItems = computed(() =>
  result.value
    ? [
        ['技能匹配', result.value.dimensionScores.skillMatch],
        ['项目相关', result.value.dimensionScores.projectRelevance],
        ['工程能力', result.value.dimensionScores.engineeringAbility],
        ['业务理解', result.value.dimensionScores.businessUnderstanding],
      ]
    : [],
)

const resumeSuggestionText = computed(() => (result.value ? buildJobMatchCopy(result.value) : ''))

onBeforeUnmount(() => {
  controller.value?.abort()
})

onMounted(() => {
  void loadAssets()
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
    notify('已有资料加载失败，可手动填写后继续分析', 'warning')
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
      notify('已带入简历管理中的简历', 'success')
    } else {
      notify('指定简历加载失败，可手动选择或填写后继续分析', 'warning')
    }
  }

  const jdId = readQueryId('jdId')
  if (jdId) {
    if (jobOptions.value.some((item) => item.id === jdId)) {
      applyJobDescription(jdId)
      notify('已带入 JD 管理中的岗位描述', 'success')
    } else {
      notify('指定 JD 加载失败，可手动选择或填写后继续匹配', 'warning')
    }
  }
}

function applyResume(id: string) {
  selectedResumeId.value = id
  const resume = resumeOptions.value.find((item) => item.id === id)
  if (!resume) return
  form.resumeContent = resume.content.slice(0, MAX_RESUME_LENGTH)
  form.jobTitle = resume.targetRole || form.jobTitle
  uploadError.value = ''
}

function applyJobDescription(id: string) {
  selectedJobDescriptionId.value = id
  const job = jobOptions.value.find((item) => item.id === id)
  if (!job) return
  form.jobTitle = job.jobTitle
  form.companyName = job.companyName || ''
  form.jobDescription = job.content
}

function jobDescriptionLabel(job: JobDescriptionRecord) {
  return job.companyName ? `${job.companyName} - ${job.jobTitle}` : job.jobTitle
}

async function onResumeFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (form.resumeContent.trim()) {
    const confirmed = await messageBox.confirm({
      type: 'warning',
      title: '替换当前简历内容？',
      message: '上传新文件会覆盖当前简历输入区内容，并清空已选择的已有简历。',
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

async function submit() {
  if (loading.value || uploadLoading.value) return

  if (!form.resumeContent.trim() || !form.jobTitle.trim() || !form.jobDescription.trim()) {
    errorMessage.value = '请填写简历内容、岗位名称和 JD 后再开始匹配。'
    notify('请填写简历内容、岗位名称和 JD', 'warning')
    return
  }

  controller.value = new AbortController()
  loading.value = true
  streamPreview.value = ''
  streamStatus.value = 'AI 正在建立连接'
  errorMessage.value = ''

  try {
    const response = await matchJobStream(
      {
        ...form,
        resumeId: selectedResumeId.value || undefined,
        jobDescriptionId: selectedJobDescriptionId.value || undefined,
      },
      {
        signal: controller.value.signal,
        onStart: () => {
          streamStatus.value = 'AI 正在对比简历与 JD'
        },
        onDelta: (delta) => {
          streamStatus.value = 'AI 正在生成匹配报告'
          streamPreview.value += delta
        },
      },
    )
    result.value = response.result
    void loadAssets()
    resultStatus.value = response.meta?.status || 'success'
    notify(
      resultStatus.value === 'parse_error'
        ? 'AI 结果格式异常，已保留原文整理结果'
        : response.cached
          ? '命中缓存，岗位匹配结果已生成'
          : '岗位匹配结果已生成',
      resultStatus.value === 'parse_error' ? 'warning' : 'success',
    )
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      notify('已取消本次匹配分析', 'info')
    } else {
      errorMessage.value = '岗位匹配生成失败，请稍后重试。'
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

async function copyResumeSuggestions() {
  if (!resumeSuggestionText.value) return
  try {
    await navigator.clipboard.writeText(resumeSuggestionText.value)
    notify('已复制修改建议', 'success')
  } catch {
    errorMessage.value = '复制失败，请检查浏览器剪贴板权限后重试。'
    notify('复制失败', 'error')
  }
}

function goInterviewFromJobMatch() {
  workflowStore.setInterviewContext({
    targetRole: form.jobTitle,
    resumeContent: form.resumeContent,
    jobDescription: form.jobDescription,
    sourceLabel: '岗位匹配',
  })
  void router.push('/interview')
}
</script>

<template>
  <div class="page">
    <header class="flex items-center gap-4">
      <div class="icon-tile">
        <Target :size="23" />
      </div>
      <div>
        <h1 class="m-0 text-[26px] font-black text-[#0f172a]">岗位 JD 匹配</h1>
        <p class="mt-1.5 text-sm font-semibold text-[#64748b]">分析简历与目标 JD 的匹配度，定位优势、风险和补强方向。</p>
      </div>
    </header>

    <InlineStatus v-if="assetsError" type="warning" title="资料加载失败" :description="assetsError" />

    <div class="feature-workspace-balanced">
      <GlassCard class="feature-pane-left">
        <h2 class="mb-3 flex items-center gap-2 text-base font-black text-[#0f172a]">
          <FileText :size="19" class="text-indigo-500" />
          简历内容
        </h2>

        <InlineStatus v-if="assetsLoading" class="mb-4" type="loading" title="正在加载已有资料" description="稍等一下，简历和 JD 记录马上回来。" />

        <label v-if="resumeOptions.length" class="mb-4 block">
          <span class="field-label">选择已有简历</span>
          <select v-model="selectedResumeId" class="select-base" :disabled="loading || uploadLoading" @change="applyResume(selectedResumeId)">
            <option value="">手动输入 / 上传新简历</option>
            <option v-for="resume in resumeOptions" :key="resume.id" :value="resume.id">{{ resume.title }}</option>
          </select>
        </label>

        <label class="mb-4 grid min-h-[96px] cursor-pointer place-items-center rounded-[14px] border border-dashed border-indigo-200 bg-white/45 p-4 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40" :class="{ 'pointer-events-none opacity-70': uploadLoading || loading }">
          <input class="hidden" type="file" accept=".pdf,.docx,.txt,.md" :disabled="uploadLoading || loading" @change="onResumeFileChange" />
          <UploadCloud :size="32" class="text-indigo-500" />
          <span class="mt-2 block text-sm font-extrabold text-[#26324f]">{{ uploadLoading ? '解析中...' : '上传 PDF / DOCX / TXT / MD' }}</span>
          <span v-if="selectedFileName" class="mt-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">{{ selectedFileName }}</span>
        </label>
        <InlineStatus v-if="uploadError" class="mb-4" type="error" title="上传失败" :description="uploadError" />

        <textarea v-model="form.resumeContent" class="textarea-base min-h-[130px]" :maxlength="MAX_RESUME_LENGTH" placeholder="粘贴或上传简历内容..." :disabled="loading || uploadLoading" @input="selectedResumeId = ''" />
        <p class="mt-2 text-right text-xs text-[#94a3b8]">{{ form.resumeContent.length }} / {{ MAX_RESUME_LENGTH }}</p>

        <h2 class="mb-3 flex items-center gap-2 text-base font-black text-[#0f172a]">
          <BriefcaseBusiness :size="19" class="text-indigo-500" />
          目标岗位
        </h2>
        <input v-model="form.jobTitle" class="input-base" placeholder="岗位名称" :disabled="loading" />
        <input v-model="form.companyName" class="input-base mt-3" placeholder="公司名称（可选）" :disabled="loading" />
        <div class="mb-4 mt-5 flex items-center justify-between">
          <h2 class="m-0 flex items-center gap-2 text-base font-black text-[#0f172a]">
            <ClipboardList :size="19" class="text-indigo-500" />
            职位描述（JD）
          </h2>
          <span class="soft-tag">AI 解析</span>
        </div>

        <label v-if="jobOptions.length" class="mb-4 block">
          <span class="field-label">选择已有 JD</span>
          <select v-model="selectedJobDescriptionId" class="select-base" :disabled="loading" @change="applyJobDescription(selectedJobDescriptionId)">
            <option value="">手动输入新 JD</option>
            <option v-for="job in jobOptions" :key="job.id" :value="job.id">{{ jobDescriptionLabel(job) }}</option>
          </select>
        </label>

        <textarea v-model="form.jobDescription" class="textarea-base min-h-[100px]" maxlength="10000" placeholder="粘贴岗位 JD..." :disabled="loading" @input="selectedJobDescriptionId = ''" />
        <p class="mt-2 text-right text-xs text-[#94a3b8]">{{ form.jobDescription.length }} / 10000</p>

        <InlineStatus v-if="errorMessage" class="mt-4" type="error" title="暂时无法开始匹配" :description="errorMessage" />

        <div class="mt-5 flex justify-end gap-3">
          <button v-if="loading" class="btn-secondary min-w-[150px]" @click="cancelStream">
            <Square :size="16" />
            取消生成
          </button>
          <button class="btn-primary min-w-[200px]" :disabled="loading || uploadLoading" @click="submit">
            <WandSparkles :size="18" />
            {{ loading ? '分析中...' : '开始匹配分析' }}
          </button>
        </div>
      </GlassCard>

      <GlassCard class="feature-pane-right soft-scrollbar">
        <div class="mb-5 flex items-baseline gap-4">
          <h2 class="m-0 text-[22px] font-black text-[#0f172a]">匹配结果</h2>
          <span class="text-xs text-[#64748b]">基于简历与 JD 的 AI 对比分析</span>
        </div>

        <StreamPreview v-if="loading" :status="streamStatus" :content="streamPreview" />

        <EmptyState v-if="!result && !loading" title="等待匹配分析" description="填写简历和 JD 后，这里会展示匹配度、关键词、风险点和面试准备建议。" />

        <div v-else-if="result" class="grid gap-4">
          <section class="section-card">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="m-0 text-base font-black text-[#0f172a]">下一步建议</h3>
                <p class="mb-0 mt-1 text-sm font-semibold text-[#64748b]">先补齐缺失关键词和风险点，再带着当前 JD 进入模拟面试。</p>
              </div>
              <div class="flex flex-wrap gap-3">
                <button class="btn-secondary min-h-10" @click="copyResumeSuggestions">
                  <Copy :size="18" />
                  复制修改建议
                </button>
                <button class="btn-secondary min-h-10" @click="goInterviewFromJobMatch">
                  <Mic :size="18" />
                  去模拟面试
                </button>
              </div>
            </div>
          </section>
          <div class="grid grid-cols-[0.78fr_1fr] gap-4">
            <section class="section-card">
              <ScoreCard :score="result.matchScore" title="综合匹配度" :summary="result.summary" />
            </section>

            <section class="section-card">
              <h3 class="mb-4 mt-0 flex items-center gap-2 text-lg font-black text-[#0f172a]">
                维度参考
                <Info :size="15" class="text-[#94a3b8]" />
              </h3>
              <ul class="m-0 grid list-none gap-3 p-0">
                <li v-for="[label, score] in dimensionItems" :key="label" class="grid grid-cols-[90px_1fr_48px] items-center gap-3 text-sm text-[#475569]">
                  <span>{{ label }}</span>
                  <span class="progress-track"><i class="progress-fill block" :style="{ width: `${score}%` }" /></span>
                  <b>{{ score }}</b>
                </li>
              </ul>
            </section>
          </div>

          <p v-if="resultStatus === 'parse_error'" class="m-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-700">
            AI 返回内容不是合法 JSON，已保留原文整理结果，建议重试生成。
          </p>

          <div class="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <section class="section-card">
              <h3 class="mb-4 mt-0 text-lg font-black text-[#0f172a]">匹配关键词</h3>
              <KeywordTags :tags="result.matchedKeywords" type="success" />
            </section>
            <section class="section-card">
              <h3 class="mb-4 mt-0 text-lg font-black text-[#0f172a]">缺失关键词</h3>
              <KeywordTags :tags="result.missingKeywords" type="danger" />
            </section>
            <SuggestionList title="优势" :items="result.advantages" />
            <SuggestionList title="风险点" :items="result.risks" />
            <SuggestionList title="简历修改建议" :items="result.resumeSuggestions" />
            <SuggestionList title="面试准备建议" :items="result.interviewPreparation" />
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
</template>


