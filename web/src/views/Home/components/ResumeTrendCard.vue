<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { ArrowRight, TrendingUp } from 'lucide-vue-next'
import { getInstanceByDom, graphic, init } from '@/utils/echarts'
import type { ECharts, EChartsCoreOption } from '@/utils/echarts'
import type { DashboardResumeTrend } from '@/types/dashboard'

const props = defineProps<{
  trend: DashboardResumeTrend | null
  loading: boolean
}>()

const trendEl = ref<HTMLDivElement | null>(null)
const trendChart = shallowRef<ECharts | null>(null)

// 至少两个诊断点才谈得上“趋势”；单点或无点走提示态。
const hasTrend = computed(() => (props.trend?.points.length ?? 0) >= 2)

function renderTrend() {
  if (!trendEl.value || !hasTrend.value || !props.trend) return
  const chart = getInstanceByDom(trendEl.value) ?? init(trendEl.value)
  trendChart.value = chart
  chart.setOption(buildTrendOption(props.trend), true)
}

function buildTrendOption(data: DashboardResumeTrend): EChartsCoreOption {
  return {
    grid: { top: 24, right: 20, bottom: 40, left: 44 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      // 同一天可能有多次诊断，展示到分钟避免刻度重名。
      data: data.points.map((point) => formatTrendLabel(point.date)),
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b', fontWeight: 600 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitLine: { lineStyle: { color: '#eef2f7' } },
      axisLabel: { color: '#94a3b8' },
    },
    series: [
      {
        name: '综合得分',
        type: 'line',
        smooth: true,
        data: data.points.map((point) => point.score),
        symbolSize: 8,
        lineStyle: { width: 3, color: '#2563eb' },
        itemStyle: { color: '#2563eb' },
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37,99,235,0.26)' },
            { offset: 1, color: 'rgba(37,99,235,0.02)' },
          ]),
        },
      },
    ],
  }
}

function formatTrendLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function resizeTrend() {
  trendChart.value?.resize()
}

function disposeTrend() {
  trendChart.value?.dispose()
  trendChart.value = null
}

// 数据/加载态变化后，等容器挂载再画（v-if 控制的容器需先在 DOM 中）。
watch([() => props.trend, () => props.loading], async () => {
  if (props.loading || !hasTrend.value) return
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  renderTrend()
})

// 记录减少到不足两条时容器会被 v-if 卸载，先释放实例避免挂在游离 DOM 上泄漏。
watch(hasTrend, (value) => {
  if (!value) disposeTrend()
})

onMounted(() => {
  window.addEventListener('resize', resizeTrend)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeTrend)
  disposeTrend()
})
</script>

<template>
  <section class="glass-card trend-card" aria-label="简历得分趋势">
    <div class="trend-heading">
      <div>
        <h2>简历得分趋势</h2>
        <p v-if="hasTrend">最近 {{ trend?.points.length }} 次简历诊断的综合得分</p>
        <p v-else>完成简历诊断后，这里会展示得分的变化曲线。</p>
      </div>
      <span class="trend-badge">
        <TrendingUp :size="16" />
        成长追踪
      </span>
    </div>

    <div v-if="hasTrend" ref="trendEl" class="trend-chart"></div>
    <div v-else class="trend-empty">
      <TrendingUp :size="26" />
      <p>
        {{
          loading
            ? '正在加载趋势…'
            : (trend?.points.length ?? 0) === 1
              ? '已有一次诊断记录，再诊断一次即可看到得分变化曲线。'
              : '还没有诊断记录，完成一次简历诊断后即可追踪得分成长。'
        }}
      </p>
      <RouterLink v-if="!loading" to="/resume-analyze">
        去诊断简历
        <ArrowRight :size="16" />
      </RouterLink>
    </div>
  </section>
</template>

<style scoped lang="scss">
.trend-card {
  padding: var(--panel-padding);
}

.trend-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h2 {
    margin: 0;
    color: #07163f;
    font-size: 21px;
    font-weight: 900;
  }

  p {
    margin: 7px 0 0;
    color: #415982;
    font-size: 14px;
    font-weight: 650;
  }
}

.trend-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  padding: 6px 12px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.trend-chart {
  height: 300px;
  width: 100%;
  margin-top: 12px;
}

.trend-empty {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 200px;
  align-content: center;
  text-align: center;

  p {
    margin: 0;
    max-width: 320px;
    color: #64748b;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.6;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #2563eb;
    font-size: 14px;
    font-weight: 800;
  }

  svg {
    color: #94a3b8;
  }
}
</style>
