<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  BarChart3,
  BriefcaseBusiness,
  CircleGauge,
  FileSearch,
  Mic,
  PackageCheck,
  Send,
  Star,
  Target,
} from 'lucide-vue-next'
import InlineStatus from '@/components/InlineStatus/index.vue'
import { getDashboardOverview, getResumeScoreTrend } from '@/api/dashboard'
import type { DashboardOverview, DashboardResumeTrend } from '@/types/dashboard'
import ActionGrid from './components/ActionGrid.vue'
import DashboardHeader from './components/DashboardHeader.vue'
import MetricGrid from './components/MetricGrid.vue'
import ResumeDiagnosisCard from './components/ResumeDiagnosisCard.vue'
import ResumeTrendCard from './components/ResumeTrendCard.vue'
import SuggestionsCard from './components/SuggestionsCard.vue'
import type { DashboardMetric, DashboardSuggestion, ScoreDimension } from './types'

// 综合得分环的周长，与 ResumeDiagnosisCard 中 .ring-value 的 stroke-dasharray(414) 保持一致。
const RING_CIRCUMFERENCE = 414
const SUGGESTION_TONES = ['blue', 'green', 'purple', 'orange'] as const
const SUGGESTION_ICONS = [FileSearch, PackageCheck, Star, BriefcaseBusiness]

const loading = ref(true)
const loadError = ref(false)
const overview = ref<DashboardOverview | null>(null)
const trend = ref<DashboardResumeTrend | null>(null)

async function loadOverview() {
  loading.value = true
  loadError.value = false
  try {
    // 概览与趋势相互独立，并行拉取；任一失败不拖垮另一个。
    const [overviewResult, trendResult] = await Promise.allSettled([
      getDashboardOverview(),
      getResumeScoreTrend(),
    ])
    // 概览是页面主数据：失败置错误态并保留上一次数据；
    // 趋势失败只影响趋势卡（卡内有空态），toast 已由拦截器弹出。
    if (overviewResult.status === 'fulfilled') {
      overview.value = overviewResult.value
    } else {
      loadError.value = true
    }
    trend.value = trendResult.status === 'fulfilled' ? trendResult.value : null
  } finally {
    loading.value = false
  }
}

onMounted(loadOverview)

const resumeScore = computed(() => overview.value?.resume.score ?? null)

function formatScore(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : String(Math.round(value))
}

function formatDelta(delta: number | null | undefined, unit = '') {
  if (delta === null || delta === undefined) return '暂无对比数据'
  if (delta === 0) return '与上次持平'
  const sign = delta > 0 ? '+' : ''
  return `较上次 ${sign}${Math.round(delta)}${unit}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const metrics = computed<DashboardMetric[]>(() => {
  const data = overview.value
  return [
    {
      label: '简历综合得分',
      value: formatScore(data?.resume.score),
      unit: '/100',
      change: formatDelta(data?.resume.delta),
      icon: FileSearch,
      tone: 'blue',
    },
    {
      label: '岗位匹配度',
      value: formatScore(data?.jobMatch.score),
      unit: '%',
      change: formatDelta(data?.jobMatch.delta, '%'),
      icon: Target,
      tone: 'green',
    },
    {
      label: '模拟面试得分',
      value: formatScore(data?.interview.score),
      unit: '/100',
      change: formatDelta(data?.interview.delta),
      icon: Mic,
      tone: 'purple',
    },
    {
      label: '累计记录',
      value: String(data?.recordCount ?? 0),
      unit: '',
      change: `简历 / 匹配 / 面试共 ${data?.recordCount ?? 0} 条`,
      icon: Send,
      tone: 'cyan',
    },
  ]
})

const scoreDimensions = computed<ScoreDimension[]>(() => {
  const dimensions = overview.value?.resume.dimensionScores
  if (!dimensions) return []
  return [
    { label: '技能匹配度', score: dimensions.skillMatch, color: '#3b82f6', icon: CircleGauge },
    { label: '项目质量', score: dimensions.projectQuality, color: '#8b5cf6', icon: FileSearch },
    { label: '技术深度', score: dimensions.technicalDepth, color: '#f59e0b', icon: BarChart3 },
    { label: '专业表达', score: dimensions.professionalExpression, color: '#16a36a', icon: Star },
  ]
})

const suggestions = computed<DashboardSuggestion[]>(() =>
  (overview.value?.suggestions ?? []).map((text, index) => ({
    text,
    tone: SUGGESTION_TONES[index % SUGGESTION_TONES.length],
    icon: SUGGESTION_ICONS[index % SUGGESTION_ICONS.length],
  })),
)

const ringOffset = computed(() => {
  if (resumeScore.value === null) return RING_CIRCUMFERENCE
  return RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, resumeScore.value)) / 100)
})

const scoreBadge = computed(() => {
  const score = resumeScore.value
  if (score === null) return '暂无'
  if (score >= 85) return '优秀'
  if (score >= 70) return '良好'
  if (score >= 60) return '中等'
  return '待提升'
})

const lastAnalyzedLabel = computed(() => {
  const formatted = formatDateTime(overview.value?.resume.lastAnalyzedAt)
  return formatted ? `上次诊断：${formatted}` : '尚未进行简历诊断'
})
</script>

<template>
  <div class="page home-page">
    <DashboardHeader :loading="loading" @refresh="loadOverview" />

    <InlineStatus
      v-if="loadError"
      type="error"
      title="仪表盘数据加载失败"
      description="可能是网络或服务异常，请重试。"
    >
      <button type="button" class="btn-secondary mt-3 min-h-9 text-sm" @click="loadOverview">
        重新加载
      </button>
    </InlineStatus>

    <MetricGrid :metrics="metrics" />

    <section class="home-work-grid">
      <ResumeDiagnosisCard
        :score-text="formatScore(resumeScore)"
        :score-badge="scoreBadge"
        :ring-offset="ringOffset"
        :dimensions="scoreDimensions"
        :last-analyzed-label="lastAnalyzedLabel"
        :loading="loading"
      />
      <SuggestionsCard :suggestions="suggestions" :loading="loading" />
    </section>

    <ResumeTrendCard :trend="trend" :loading="loading" />

    <ActionGrid />
  </div>
</template>

<style scoped>
.home-page {
  animation: pageIn 0.42s ease both;
}

/* 独立类名，避免与全局 .work-grid 同名冲突（列比例与断点是首页专属的）。 */
.home-work-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.66fr) minmax(390px, 1fr);
  gap: var(--page-gap);
  /* 两卡等高，底边始终对齐 */
  align-items: stretch;
}

@keyframes pageIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1120px) {
  .home-work-grid {
    grid-template-columns: 1fr;
  }
}
</style>
