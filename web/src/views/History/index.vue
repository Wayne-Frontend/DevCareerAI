<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Clock3, Code2, Copy, FileSearch, History, Mic, RefreshCw, Search, Target, Trash2 } from 'lucide-vue-next'
import EmptyState from '../../components/EmptyState/index.vue'
import LoadingButton from '../../components/LoadingButton/index.vue'
import SkeletonCard from '../../components/SkeletonCard/index.vue'
import { deleteHistoryRecord, getHistory } from '../../api/history'
import type { HistoryRecord, HistoryType } from '../../types/history'
import { formatDateTime } from '../../utils/format'
import { messageBox } from '../../utils/messageBox'
import { notify } from '../../utils/notify'
import { useWorkflowStore } from '../../stores/workflow'
import { buildInterviewStudyPlanCopy, buildJobMatchCopy, buildProjectCopy, buildResumeSuggestionCopy } from '../../utils/resultCopy'

type FilterType = 'all' | HistoryType
type DetailSection = {
  title: string
  text?: string
  items?: string[]
  tags?: string[]
  ordered?: boolean
}

const workflowStore = useWorkflowStore()
const router = useRouter()
const activeType = ref<FilterType>('all')
const loading = ref(false)
const records = ref<HistoryRecord[]>([])
const keyword = ref('')
const activeDetail = ref<HistoryRecord | null>(null)
const deletingId = ref('')

const tabs: Array<{ label: string; value: FilterType; icon?: typeof FileSearch }> = [
  { label: '全部', value: 'all' },
  { label: '简历诊断', value: 'resume-analysis', icon: FileSearch },
  { label: '项目优化', value: 'project-optimization', icon: Code2 },
  { label: '岗位匹配', value: 'job-match', icon: Target },
  { label: '模拟面试', value: 'interview', icon: Mic },
]

const typeMeta: Record<HistoryType, { label: string; icon: typeof FileSearch; tagClass: string; scoreClass: string }> = {
  'resume-analysis': {
    label: '简历诊断',
    icon: FileSearch,
    tagClass: 'bg-blue-50 text-blue-600',
    scoreClass: 'bg-emerald-50 text-emerald-600',
  },
  'project-optimization': {
    label: '项目优化',
    icon: Code2,
    tagClass: 'bg-violet-50 text-violet-600',
    scoreClass: 'bg-blue-50 text-blue-600',
  },
  'job-match': {
    label: '岗位匹配',
    icon: Target,
    tagClass: 'bg-emerald-50 text-emerald-600',
    scoreClass: 'bg-emerald-50 text-emerald-600',
  },
  interview: {
    label: '模拟面试',
    icon: Mic,
    tagClass: 'bg-purple-50 text-purple-600',
    scoreClass: 'bg-blue-50 text-blue-600',
  },
}

const displayRecords = computed(() => {
  const filtered = activeType.value === 'all' ? records.value : records.value.filter((record) => record.type === activeType.value)
  if (!keyword.value.trim()) return filtered
  const query = keyword.value.toLowerCase()
  return filtered.filter((record) => searchText(record).toLowerCase().includes(query))
})

async function load(type: FilterType = activeType.value) {
  loading.value = true
  try {
    records.value = await getHistory(type === 'all' ? undefined : type)
  } finally {
    loading.value = false
  }
}

async function changeType(type: FilterType) {
  activeType.value = type
  await load(type)
}

async function remove(record: HistoryRecord) {
  const confirmed = await messageBox.confirm({
    type: 'danger',
    title: '确认删除这条记录？',
    message: `「${displayTitle(record)}」删除后无法恢复。`,
    confirmText: '删除',
  })
  if (!confirmed) return

  deletingId.value = record.id
  try {
    await deleteHistoryRecord(record.id)
    notify('记录已删除', 'success')
    if (activeDetail.value?.id === record.id) activeDetail.value = null
    await load(activeType.value)
  } finally {
    deletingId.value = ''
  }
}

function rawDetailText(record: HistoryRecord) {
  return JSON.stringify(record.detail || record, null, 2)
}

function detailObject(record: HistoryRecord | null) {
  return record?.detail && typeof record.detail === 'object' ? (record.detail as Record<string, unknown>) : {}
}

function detailString(record: HistoryRecord | null, key: string) {
  const value = detailObject(record)[key]
  return typeof value === 'string' ? value : ''
}

function detailList(record: HistoryRecord | null, key: string) {
  const value = detailObject(record)[key]
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const objectItem = item as Record<string, unknown>
        const before = typeof objectItem.before === 'string' ? objectItem.before : ''
        const after = typeof objectItem.after === 'string' ? objectItem.after : ''
        if (before || after) return [before && `原：${before}`, after && `优化：${after}`].filter(Boolean).join('\n')
        return JSON.stringify(item)
      }
      return String(item)
    })
    .filter((item) => item.trim())
}

function dimensionItems(record: HistoryRecord | null) {
  const dimensions = detailObject(record).dimensionScores
  if (!dimensions || typeof dimensions !== 'object' || Array.isArray(dimensions)) return []
  return Object.entries(dimensions as Record<string, unknown>).map(([key, value]) => `${key}：${value}`)
}

function detailScore(record: HistoryRecord | null) {
  const detail = detailObject(record)
  const value = detail.score ?? detail.matchScore ?? detail.totalScore ?? record?.score
  const score = Number(value)
  return Number.isFinite(score) ? Math.round(score) : undefined
}

function displayTitle(record: HistoryRecord) {
  return detailString(record, 'projectName') || detailString(record, 'jobTitle') || record.title || typeMeta[record.type].label
}

function searchText(record: HistoryRecord) {
  const detail = detailObject(record)
  const values = Object.values(detail).flatMap((value) => {
    if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
    if (value && typeof value === 'object') return [JSON.stringify(value)]
    return [String(value ?? '')]
  })
  return [displayTitle(record), typeMeta[record.type].label, ...values].join(' ')
}

function summaryText(record: HistoryRecord | null) {
  return (
    detailString(record, 'summary') ||
    detailString(record, 'projectDescription') ||
    detailString(record, 'projectName') ||
    '该记录暂无摘要字段，可查看下方结构化内容或原始数据。'
  )
}

function detailSections(record: HistoryRecord | null): DetailSection[] {
  if (!record) return []

  if (record.type === 'resume-analysis') {
    return [
      { title: '维度评分', items: dimensionItems(record) },
      { title: '优势', items: detailList(record, 'strengths') },
      { title: '问题定位', items: detailList(record, 'weaknesses') },
      { title: '优化建议', items: detailList(record, 'suggestions'), ordered: true },
      { title: '项目优化方向', items: detailList(record, 'projectSuggestions'), ordered: true },
      { title: '优化示例', items: detailList(record, 'optimizedExamples') },
    ]
  }

  if (record.type === 'project-optimization') {
    return [
      { title: '项目名称', text: detailString(record, 'projectName') },
      { title: '项目描述', text: detailString(record, 'projectDescription') },
      { title: '技术栈', tags: detailList(record, 'techStack') },
      { title: '个人职责', items: detailList(record, 'responsibilities') },
      { title: '技术亮点', items: detailList(record, 'highlights') },
      { title: '项目难点', items: detailList(record, 'difficulties') },
      { title: '面试追问', items: detailList(record, 'interviewQuestions'), ordered: true },
    ]
  }

  if (record.type === 'job-match') {
    return [
      { title: '维度评分', items: dimensionItems(record) },
      { title: '匹配关键词', tags: detailList(record, 'matchedKeywords') },
      { title: '缺失关键词', tags: detailList(record, 'missingKeywords') },
      { title: '优势', items: detailList(record, 'advantages') },
      { title: '风险', items: detailList(record, 'risks') },
      { title: '简历修改建议', items: detailList(record, 'resumeSuggestions'), ordered: true },
      { title: '面试准备建议', items: detailList(record, 'interviewPreparation'), ordered: true },
    ]
  }

  return [
    { title: '优势', items: detailList(record, 'strengths') },
    { title: '短板', items: detailList(record, 'weaknesses') },
    { title: '学习计划', items: detailList(record, 'studyPlan'), ordered: true },
  ]
}

function copyTextForRecord(record: HistoryRecord) {
  if (record.type === 'resume-analysis') return buildResumeSuggestionCopy(record.detail)
  if (record.type === 'project-optimization') return buildProjectCopy(record.detail)
  if (record.type === 'job-match') return buildJobMatchCopy(record.detail)
  return buildInterviewStudyPlanCopy(record.detail)
}

function copyLabel(record: HistoryRecord) {
  if (record.type === 'resume-analysis') return '复制优化建议'
  if (record.type === 'project-optimization') return '复制项目表达'
  if (record.type === 'job-match') return '复制修改建议'
  return '复制学习计划'
}

async function copyRecord(record: HistoryRecord) {
  try {
    await navigator.clipboard.writeText(copyTextForRecord(record))
    notify('已复制复盘内容', 'success')
  } catch {
    notify('复制失败，请检查浏览器剪贴板权限后重试', 'error')
  }
}

function canGoInterview(record: HistoryRecord) {
  return record.type === 'project-optimization' || record.type === 'job-match'
}

function goInterviewFromRecord(record: HistoryRecord) {
  if (record.type === 'project-optimization') {
    const projectContext = buildProjectCopy(record.detail)
    workflowStore.setInterviewContext({
      targetRole: detailString(record, 'targetRole'),
      resumeContent: projectContext,
      projectContext,
      sourceLabel: '项目优化复盘',
    })
  } else if (record.type === 'job-match') {
    workflowStore.setInterviewContext({
      targetRole: detailString(record, 'jobTitle'),
      resumeContent: detailString(record, 'resumeContent'),
      jobDescription: detailString(record, 'jobDescription'),
      sourceLabel: '岗位匹配复盘',
    })
  }
  void router.push('/interview')
}
onMounted(() => load())
</script>

<template>
  <div class="page">
    <header class="flex items-center gap-5">
      <div class="icon-tile h-[60px] w-[60px] rounded-[18px]">
        <History :size="32" />
      </div>
      <div>
        <h1 class="m-0 text-[34px] font-black text-[#0f172a]">历史记录</h1>
        <p class="mt-2 text-base font-semibold text-[#64748b]">查看和删除简历诊断、项目优化、岗位匹配和模拟面试记录。</p>
      </div>
      <LoadingButton class="ml-auto" variant="secondary" :loading="loading" loading-text="刷新中..." @click="load(activeType)">
        <template #icon><RefreshCw :size="17" /></template>
        {{ loading ? '刷新中...' : '刷新' }}
      </LoadingButton>
    </header>

    <section class="glass-card p-5">
      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-wrap gap-3">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-[13px] px-5 text-sm font-black transition"
            :class="activeType === tab.value ? 'bg-indigo-100 text-indigo-600' : 'bg-white/70 text-[#64748b] hover:text-indigo-600'"
            :disabled="loading"
            @click="changeType(tab.value)"
          >
            <component v-if="tab.icon" :is="tab.icon" :size="16" />
            {{ tab.label }}
          </button>
        </div>

        <label class="flex h-11 w-[280px] items-center gap-3 rounded-[13px] border border-[rgba(203,213,225,0.82)] bg-white/68 px-4">
          <input v-model="keyword" class="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#94a3b8]" placeholder="搜索记录标题..." />
          <Search :size="18" class="text-[#64748b]" />
        </label>
      </div>
    </section>

    <section v-if="loading" class="grid grid-cols-4 gap-5">
      <SkeletonCard v-for="index in 4" :key="index" />
    </section>

    <EmptyState v-else-if="displayRecords.length === 0" title="暂无历史记录" description="完成一次 AI 分析或模拟面试后，记录会出现在这里。" />

    <section v-else class="grid grid-cols-4 gap-5">
      <article v-for="record in displayRecords" :key="record.id" class="section-card flex h-[250px] flex-col p-5">
        <div class="flex items-center justify-between">
          <span class="inline-flex h-10 items-center gap-2 rounded-[12px] px-3 text-sm font-black" :class="typeMeta[record.type].tagClass">
            <component :is="typeMeta[record.type].icon" :size="17" />
            {{ typeMeta[record.type].label }}
          </span>
          <strong v-if="record.score !== undefined" class="rounded-[10px] px-3 py-2 text-sm font-black" :class="typeMeta[record.type].scoreClass">{{ record.score }} 分</strong>
        </div>

        <h2 class="mb-3 mt-5 text-lg font-black text-[#0f172a]">{{ displayTitle(record) }}</h2>
        <p class="m-0 flex items-center gap-1.5 text-sm font-semibold text-[#64748b]">
          <Clock3 :size="15" />
          {{ formatDateTime(record.createdAt) }}
        </p>
        <div class="mt-auto grid grid-cols-2 gap-3 pt-4">
          <button class="btn-secondary min-h-10 whitespace-nowrap text-sm" @click="activeDetail = record">查看</button>
          <LoadingButton variant="danger" class="min-h-10 whitespace-nowrap text-sm" :loading="deletingId === record.id" loading-text="删除中..." @click="remove(record)">
            <template #icon><Trash2 :size="16" /></template>
            {{ deletingId === record.id ? '删除中...' : '删除' }}
          </LoadingButton>
        </div>
      </article>
    </section>

    <section v-if="activeDetail" class="glass-card p-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="m-0 text-xl font-black text-[#0f172a]">{{ displayTitle(activeDetail) }}</h2>
        <div class="flex flex-wrap gap-3">
          <button class="btn-secondary min-h-10" @click="copyRecord(activeDetail)">
            <Copy :size="18" />
            {{ copyLabel(activeDetail) }}
          </button>
          <button v-if="canGoInterview(activeDetail)" class="btn-secondary min-h-10" @click="goInterviewFromRecord(activeDetail)">
            <Mic :size="18" />
            去模拟面试
          </button>
          <button class="btn-secondary min-h-10" @click="activeDetail = null">关闭</button>
        </div>
      </div>

      <div class="grid gap-4">
        <div class="grid grid-cols-[120px_1fr] gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
          <div v-if="detailScore(activeDetail) !== undefined" class="grid h-[104px] w-[104px] place-items-center rounded-full bg-indigo-50">
            <strong class="text-3xl font-black text-indigo-600">{{ detailScore(activeDetail) }}</strong>
            <span class="-mt-7 text-xs font-bold text-[#64748b]">分</span>
          </div>
          <div v-else class="icon-tile h-[104px] w-[104px] rounded-[24px]">
            <component :is="typeMeta[activeDetail.type].icon" :size="42" />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="soft-tag">{{ typeMeta[activeDetail.type].label }}</span>
              <span class="soft-tag">{{ formatDateTime(activeDetail.createdAt) }}</span>
            </div>
            <p class="mb-0 mt-3 text-sm leading-7 text-[#475569]">{{ summaryText(activeDetail) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <section v-for="section in detailSections(activeDetail)" :key="section.title" class="section-card">
            <h3 class="mb-3 mt-0 text-base font-black text-[#0f172a]">{{ section.title }}</h3>
            <p v-if="section.text" class="m-0 whitespace-pre-wrap text-sm font-semibold leading-7 text-[#334155]">{{ section.text }}</p>
            <div v-else-if="section.tags?.length" class="flex flex-wrap gap-2">
              <span v-for="tag in section.tags" :key="tag" class="rounded-[10px] border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-bold text-indigo-600">{{ tag }}</span>
            </div>
            <ol v-else-if="section.items?.length && section.ordered" class="m-0 grid gap-2 pl-5 text-sm font-semibold leading-7 text-[#334155]">
              <li v-for="item in section.items" :key="item" class="whitespace-pre-wrap">{{ item }}</li>
            </ol>
            <ul v-else-if="section.items?.length" class="m-0 grid list-disc gap-2 pl-5 text-sm font-semibold leading-7 text-[#334155]">
              <li v-for="item in section.items" :key="item" class="whitespace-pre-wrap">{{ item }}</li>
            </ul>
            <p v-else class="m-0 text-sm font-semibold text-[#94a3b8]">暂无内容</p>
          </section>
        </div>

        <details class="section-card">
          <summary class="cursor-pointer text-base font-black text-[#0f172a]">查看原始数据</summary>
          <pre class="mt-4 max-h-[320px] overflow-auto rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-slate-100">{{ rawDetailText(activeDetail) }}</pre>
        </details>
      </div>
    </section>
  </div>
</template>

