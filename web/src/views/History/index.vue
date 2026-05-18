<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Clock3, Code2, FileSearch, History, Mic, RefreshCw, Search, Target, Trash2 } from 'lucide-vue-next'
import EmptyState from '../../components/EmptyState/index.vue'
import { deleteHistoryRecord, getHistory } from '../../api/history'
import type { HistoryRecord, HistoryType } from '../../types/history'
import { formatDateTime } from '../../utils/format'
import { notify } from '../../utils/notify'

type FilterType = 'all' | HistoryType

const activeType = ref<FilterType>('all')
const loading = ref(false)
const records = ref<HistoryRecord[]>([])
const keyword = ref('')
const activeDetail = ref<HistoryRecord | null>(null)

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
  return filtered.filter((record) => record.title.toLowerCase().includes(keyword.value.toLowerCase()))
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
  await deleteHistoryRecord(record.id)
  notify('记录已删除', 'success')
  if (activeDetail.value?.id === record.id) activeDetail.value = null
  await load(activeType.value)
}

function detailText(record: HistoryRecord) {
  return JSON.stringify(record.detail || record, null, 2)
}

function detailObject(record: HistoryRecord) {
  return record.detail && typeof record.detail === 'object' ? (record.detail as Record<string, unknown>) : {}
}

function detailList(record: HistoryRecord, key: string) {
  const value = detailObject(record)[key]
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}

function detailString(record: HistoryRecord, key: string) {
  const value = detailObject(record)[key]
  return typeof value === 'string' ? value : ''
}

function detailScore(record: HistoryRecord) {
  const detail = detailObject(record)
  const value = detail.score ?? detail.matchScore ?? detail.totalScore ?? record.score
  const score = Number(value)
  return Number.isFinite(score) ? Math.round(score) : undefined
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
      <button class="btn-secondary ml-auto" :disabled="loading" @click="load(activeType)">
        <RefreshCw :size="17" />
        刷新
      </button>
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

    <EmptyState v-if="!loading && displayRecords.length === 0" title="暂无历史记录" description="完成一次 AI 分析或模拟面试后，记录会出现在这里。" />

    <section v-else class="grid grid-cols-4 gap-5">
      <article v-for="record in displayRecords" :key="record.id" class="section-card flex h-[250px] flex-col p-5">
        <div class="flex items-center justify-between">
          <span class="inline-flex h-10 items-center gap-2 rounded-[12px] px-3 text-sm font-black" :class="typeMeta[record.type].tagClass">
            <component :is="typeMeta[record.type].icon" :size="17" />
            {{ typeMeta[record.type].label }}
          </span>
          <strong v-if="record.score !== undefined" class="rounded-[10px] px-3 py-2 text-sm font-black" :class="typeMeta[record.type].scoreClass">{{ record.score }} 分</strong>
        </div>

        <h2 class="mb-3 mt-5 text-lg font-black text-[#0f172a]">{{ record.title }}</h2>
        <p class="m-0 flex items-center gap-1.5 text-sm font-semibold text-[#64748b]">
          <Clock3 :size="15" />
          {{ formatDateTime(record.createdAt) }}
        </p>
        <div class="mt-auto grid grid-cols-2 gap-3 pt-4">
          <button class="btn-secondary min-h-10 whitespace-nowrap text-sm" @click="activeDetail = record">查看</button>
          <button class="btn-secondary min-h-10 whitespace-nowrap text-sm text-red-500" @click="remove(record)">
            <Trash2 :size="16" />
            删除
          </button>
        </div>
      </article>
    </section>

    <section v-if="activeDetail" class="glass-card p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="m-0 text-xl font-black text-[#0f172a]">{{ activeDetail.title }}</h2>
        <button class="btn-secondary" @click="activeDetail = null">关闭</button>
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
            <span class="soft-tag">{{ typeMeta[activeDetail.type].label }}</span>
            <p class="mb-0 mt-3 text-sm leading-7 text-[#475569]">
              {{ detailString(activeDetail, 'summary') || detailString(activeDetail, 'projectDescription') || '该记录暂无摘要字段，可查看下方原始结构化结果。' }}
            </p>
          </div>
        </div>

        <div v-if="activeDetail.type === 'resume-analysis'" class="grid grid-cols-2 gap-4">
          <section class="section-card">
            <h3 class="mb-3 mt-0 text-base font-black text-[#0f172a]">优势</h3>
            <ul class="m-0 grid gap-2 pl-5 text-sm leading-7 text-[#475569]">
              <li v-for="item in detailList(activeDetail, 'strengths')" :key="item">{{ item }}</li>
            </ul>
          </section>
          <section class="section-card">
            <h3 class="mb-3 mt-0 text-base font-black text-[#0f172a]">问题</h3>
            <ul class="m-0 grid gap-2 pl-5 text-sm leading-7 text-[#475569]">
              <li v-for="item in detailList(activeDetail, 'weaknesses')" :key="item">{{ item }}</li>
            </ul>
          </section>
        </div>

        <div v-else-if="activeDetail.type === 'job-match'" class="grid grid-cols-2 gap-4">
          <section class="section-card">
            <h3 class="mb-3 mt-0 text-base font-black text-[#0f172a]">匹配关键词</h3>
            <div class="flex flex-wrap gap-2">
              <span v-for="item in detailList(activeDetail, 'matchedKeywords')" :key="item" class="success-tag">{{ item }}</span>
            </div>
          </section>
          <section class="section-card">
            <h3 class="mb-3 mt-0 text-base font-black text-[#0f172a]">缺失关键词</h3>
            <div class="flex flex-wrap gap-2">
              <span v-for="item in detailList(activeDetail, 'missingKeywords')" :key="item" class="danger-tag">{{ item }}</span>
            </div>
          </section>
        </div>

        <section class="section-card">
          <h3 class="mb-3 mt-0 text-base font-black text-[#0f172a]">原始结构化结果</h3>
          <pre class="max-h-[320px] overflow-auto rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-slate-100">{{ detailText(activeDetail) }}</pre>
        </section>
      </div>
    </section>
  </div>
</template>
