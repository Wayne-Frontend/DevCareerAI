<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import { Activity, Coins, Gauge, Layers, RefreshCw, Sparkles } from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState/index.vue'
import LoadingButton from '@/components/LoadingButton/index.vue'
import SkeletonCard from '@/components/SkeletonCard/index.vue'
import { getAiUsageSummary } from '@/api/aiUsage'
import type { AiUsageSummary } from '@/types/aiUsage'

const RANGE_OPTIONS = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
]

// 功能标识 → 中文名，未知 key 原样展示。
const FEATURE_LABELS: Record<string, string> = {
  'resume-analysis': '简历诊断',
  'project-optimization': '项目优化',
  'job-match': '岗位匹配',
  interview: '模拟面试',
  unknown: '未分类',
}

const loading = ref(true)
const activeDays = ref(30)
const summary = ref<AiUsageSummary | null>(null)

const dailyEl = ref<HTMLDivElement | null>(null)
const featureEl = ref<HTMLDivElement | null>(null)
const modelEl = ref<HTMLDivElement | null>(null)
const userEl = ref<HTMLDivElement | null>(null)
const dailyChart = shallowRef<echarts.ECharts | null>(null)
const featureChart = shallowRef<echarts.ECharts | null>(null)
const modelChart = shallowRef<echarts.ECharts | null>(null)
const userChart = shallowRef<echarts.ECharts | null>(null)

const totals = computed(() => summary.value?.totals ?? null)
const hasData = computed(() => (summary.value?.totals.calls ?? 0) > 0)

const kpiCards = computed(() => [
  { label: '调用次数', value: formatNumber(totals.value?.calls), icon: Activity, tone: 'blue' },
  {
    label: '总 Token',
    value: formatNumber(totals.value?.totalTokens),
    icon: Coins,
    tone: 'violet',
  },
  {
    label: '输入 Token',
    value: formatNumber(totals.value?.promptTokens),
    icon: Layers,
    tone: 'emerald',
  },
  {
    label: '输出 Token',
    value: formatNumber(totals.value?.completionTokens),
    icon: Sparkles,
    tone: 'amber',
  },
])

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '--'
  return new Intl.NumberFormat('zh-CN').format(value)
}

function featureLabel(key: string) {
  return FEATURE_LABELS[key] ?? key
}

async function load(days = activeDays.value) {
  loading.value = true
  try {
    summary.value = await getAiUsageSummary(days)
  } catch {
    // 请求层已统一弹错，这里保持空数据。
    summary.value = null
  } finally {
    loading.value = false
  }
}

async function changeRange(days: number) {
  if (days === activeDays.value) return
  activeDays.value = days
  await load(days)
}

function ensureChart(el: HTMLDivElement) {
  return echarts.getInstanceByDom(el) ?? echarts.init(el)
}

function renderCharts() {
  const data = summary.value
  if (!data || !hasData.value) return

  if (dailyEl.value) {
    dailyChart.value = ensureChart(dailyEl.value)
    dailyChart.value.setOption(buildDailyOption(data), true)
  }
  if (featureEl.value) {
    featureChart.value = ensureChart(featureEl.value)
    featureChart.value.setOption(
      buildBarOption(
        data.byFeature.map((item) => ({ name: featureLabel(item.key), value: item.totalTokens })),
        '#6366f1',
      ),
      true,
    )
  }
  if (modelEl.value) {
    modelChart.value = ensureChart(modelEl.value)
    modelChart.value.setOption(
      buildBarOption(
        data.byModel.map((item) => ({ name: item.key, value: item.totalTokens })),
        '#06b6d4',
      ),
      true,
    )
  }
  if (userEl.value) {
    userChart.value = ensureChart(userEl.value)
    userChart.value.setOption(
      buildBarOption(
        data.byUser.map((item) => ({ name: item.username, value: item.totalTokens })),
        '#8b5cf6',
      ),
      true,
    )
  }
}

function buildDailyOption(data: AiUsageSummary): echarts.EChartsCoreOption {
  return {
    grid: { top: 24, right: 20, bottom: 40, left: 56 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.daily.map((item) => item.date.slice(5)),
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b', fontWeight: 600 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#eef2f7' } },
      axisLabel: { color: '#94a3b8', formatter: (value: number) => formatCompact(value) },
    },
    series: [
      {
        name: 'Token',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: data.daily.map((item) => item.totalTokens),
        lineStyle: { width: 3, color: '#6366f1' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(99,102,241,0.28)' },
            { offset: 1, color: 'rgba(99,102,241,0.02)' },
          ]),
        },
      },
    ],
  }
}

function buildBarOption(
  items: Array<{ name: string; value: number }>,
  color: string,
): echarts.EChartsCoreOption {
  // 后端已按 token 降序返回；横向条形图从上到下阅读，反转数组让最大值居顶。
  const sorted = [...items].reverse()
  return {
    grid: { top: 16, right: 28, bottom: 16, left: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#eef2f7' } },
      axisLabel: { color: '#94a3b8', formatter: (value: number) => formatCompact(value) },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((item) => item.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#475569', fontWeight: 700 },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((item) => item.value),
        barWidth: 16,
        itemStyle: { color, borderRadius: [0, 8, 8, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#64748b',
          fontWeight: 700,
          formatter: (params: { value: number }) => formatCompact(params.value),
        },
      },
    ],
  }
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}

function resizeCharts() {
  dailyChart.value?.resize()
  featureChart.value?.resize()
  modelChart.value?.resize()
  userChart.value?.resize()
}

function disposeCharts() {
  dailyChart.value?.dispose()
  featureChart.value?.dispose()
  modelChart.value?.dispose()
  userChart.value?.dispose()
  dailyChart.value = null
  featureChart.value = null
  modelChart.value = null
  userChart.value = null
}

// 数据或加载态变化后，等 DOM 渲染完再画图（v-if 容器需先挂载）。
watch([summary, loading], async () => {
  if (loading.value || !hasData.value) return
  await nextTickSafe()
  renderCharts()
})

function nextTickSafe() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

onMounted(async () => {
  window.addEventListener('resize', resizeCharts)
  await load()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})
</script>

<template>
  <div class="page">
    <header class="flex flex-wrap items-center gap-5">
      <div class="icon-tile h-[60px] w-[60px] rounded-[18px]">
        <Gauge :size="32" />
      </div>
      <div>
        <h1 class="m-0 text-[34px] font-black text-[#0f172a]">用量监控</h1>
        <p class="mt-2 text-base font-semibold text-[#64748b]">
          AI token 全局用量总览，仅管理员可见。缓存命中的请求不计入统计。
        </p>
      </div>
      <LoadingButton
        class="ml-auto"
        variant="secondary"
        :loading="loading"
        loading-text="刷新中..."
        @click="load(activeDays)"
      >
        <template #icon><RefreshCw :size="17" /></template>
        {{ loading ? '刷新中...' : '刷新' }}
      </LoadingButton>
    </header>

    <section class="glass-card p-5">
      <div class="flex flex-wrap gap-3">
        <button
          v-for="option in RANGE_OPTIONS"
          :key="option.value"
          type="button"
          class="inline-flex h-10 items-center gap-2 rounded-[13px] px-5 text-sm font-black transition"
          :class="
            activeDays === option.value
              ? 'bg-indigo-100 text-indigo-600'
              : 'bg-white/70 text-[#64748b] hover:text-indigo-600'
          "
          :disabled="loading"
          @click="changeRange(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <section v-if="loading" class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
      <SkeletonCard v-for="index in 4" :key="index" />
    </section>

    <EmptyState
      v-else-if="!hasData"
      title="暂无用量数据"
      description="所选时间范围内还没有真实的 AI 调用记录，换个范围或稍后再来。"
    />

    <template v-else>
      <section class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
        <article
          v-for="card in kpiCards"
          :key="card.label"
          class="section-card flex items-center gap-4 p-5"
        >
          <span
            class="grid h-14 w-14 place-items-center rounded-[16px]"
            :class="`kpi-tone kpi-${card.tone}`"
          >
            <component :is="card.icon" :size="26" />
          </span>
          <div class="min-w-0">
            <p class="m-0 text-sm font-bold text-[#64748b]">{{ card.label }}</p>
            <strong class="mt-1 block text-2xl font-black text-[#0f172a]">{{ card.value }}</strong>
          </div>
        </article>
      </section>

      <section class="glass-card p-5">
        <h2 class="m-0 mb-4 text-lg font-black text-[#0f172a]">每日 Token 走势</h2>
        <div ref="dailyEl" class="h-[320px] w-full"></div>
      </section>

      <section class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div class="glass-card p-5">
          <h2 class="m-0 mb-4 text-lg font-black text-[#0f172a]">按功能分布</h2>
          <div ref="featureEl" class="h-[300px] w-full"></div>
        </div>
        <div class="glass-card p-5">
          <h2 class="m-0 mb-4 text-lg font-black text-[#0f172a]">按模型分布</h2>
          <div ref="modelEl" class="h-[300px] w-full"></div>
        </div>
      </section>

      <section class="glass-card p-5">
        <h2 class="m-0 mb-1 text-lg font-black text-[#0f172a]">用户消耗 Top 10</h2>
        <p class="m-0 mb-4 text-sm font-semibold text-[#94a3b8]">
          按 token 消耗排名，未登录调用归入“匿名”。
        </p>
        <div ref="userEl" class="h-[340px] w-full"></div>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.kpi-tone {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
.kpi-blue {
  background: rgba(99, 102, 241, 0.12);
  color: #4f46e5;
}
.kpi-violet {
  background: rgba(139, 92, 246, 0.12);
  color: #7c3aed;
}
.kpi-emerald {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}
.kpi-amber {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
}
</style>
